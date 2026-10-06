package com.universaldocs

import android.net.Uri
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.security.KeyStore
import java.security.SecureRandom
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class VaultEncryptionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "VaultEncryptionModule"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "UniversalDocs_Vault_MasterKey_v1"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_IV_LENGTH = 12
        private const val BUFFER_SIZE = 64 * 1024 // 64KB streaming chunks

        // Magic header 'U', 'V', 'L', 'T'
        private val MAGIC_HEADER = byteArrayOf(0x55, 0x56, 0x4C, 0x54)
        private const val CURRENT_VERSION: Byte = 1
    }

    private val ioScope = CoroutineScope(Dispatchers.IO)

    override fun getName(): String = MODULE_NAME

    /**
     * Retrieves or generates a 256-bit AES Master Key securely protected by the Android Keystore.
     * The raw key material is never exposed to application memory or JavaScript.
     */
    @Synchronized
    private fun getOrCreateMasterKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        if (keyStore.containsAlias(KEY_ALIAS)) {
            val entry = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
            if (entry != null) {
                return entry.secretKey
            }
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    /**
     * Resolves an input stream from content://, file://, or raw filesystem path.
     */
    private fun resolveInputStream(sourceUriOrPath: String): InputStream {
        return when {
            sourceUriOrPath.startsWith("content://") -> {
                val uri = Uri.parse(sourceUriOrPath)
                reactContext.contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Could not open input stream from content URI: $sourceUriOrPath")
            }
            sourceUriOrPath.startsWith("file://") -> {
                val file = File(Uri.parse(sourceUriOrPath).path!!)
                FileInputStream(file)
            }
            else -> {
                val file = File(sourceUriOrPath)
                FileInputStream(file)
            }
        }
    }

    /**
     * Encrypts a document file using AES-256-GCM authenticated encryption and stores it in the private vault directory.
     * Streams chunked data so large files (up to 50MB+) do not exhaust memory.
     */
    @ReactMethod
    fun encryptFile(sourceUriOrPath: String, destFileName: String, promise: Promise) {
        ioScope.launch {
            try {
                val masterKey = getOrCreateMasterKey()

                // Ensure private vault directory exists
                val vaultDir = File(reactContext.filesDir, "UniversalDocs/Vault")
                if (!vaultDir.exists()) {
                    vaultDir.mkdirs()
                }

                // Generate a unique destination file name
                val safeBaseName = destFileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                var targetFile = File(vaultDir, "$safeBaseName.enc")
                var counter = 1
                while (targetFile.exists()) {
                    targetFile = File(vaultDir, "${safeBaseName}_$counter.enc")
                    counter++
                }

                // Generate cryptographically secure 12-byte IV
                val iv = ByteArray(GCM_IV_LENGTH)
                SecureRandom().nextBytes(iv)

                val cipher = Cipher.getInstance(TRANSFORMATION)
                val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
                cipher.init(Cipher.ENCRYPT_MODE, masterKey, spec)

                val inputStream = resolveInputStream(sourceUriOrPath)
                val fos = FileOutputStream(targetFile)

                try {
                    // Write Header: Magic (4 bytes) + Version (1 byte) + IV length (1 byte) + IV (12 bytes)
                    fos.write(MAGIC_HEADER)
                    fos.write(byteArrayOf(CURRENT_VERSION))
                    fos.write(byteArrayOf(iv.size.toByte()))
                    fos.write(iv)

                    // Write encrypted stream
                    val cos = CipherOutputStream(fos, cipher)
                    val buffer = ByteArray(BUFFER_SIZE)
                    var bytesRead: Int
                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                        cos.write(buffer, 0, bytesRead)
                    }
                    cos.flush()
                    cos.close()
                } finally {
                    inputStream.close()
                }

                val result: WritableMap = Arguments.createMap().apply {
                    putString("encryptedPath", targetFile.absolutePath)
                    putString("encryptedUri", "file://${targetFile.absolutePath}")
                    putString("fileName", targetFile.name)
                    putDouble("encryptedSize", targetFile.length().toDouble())
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ENCRYPTION_ERROR", "Failed to encrypt file: ${e.message}", e)
            }
        }
    }

    /**
     * Decrypts an encrypted vault file on-demand to the private app cache directory for viewing.
     * Verifies GCM authentication tag; rejects if file is tampered or corrupted.
     */
    @ReactMethod
    fun decryptFile(encryptedPath: String, outputFileName: String, promise: Promise) {
        ioScope.launch {
            var tempDecryptedFile: File? = null
            try {
                val encFile = File(encryptedPath)
                if (!encFile.exists() || !encFile.canRead()) {
                    throw IllegalArgumentException("Encrypted vault file does not exist or cannot be read: $encryptedPath")
                }

                val fis = FileInputStream(encFile)

                // 1. Read and verify Magic Header (4 bytes)
                val magic = ByteArray(4)
                if (fis.read(magic) != 4 || !magic.contentEquals(MAGIC_HEADER)) {
                    fis.close()
                    throw IllegalArgumentException("Invalid vault file: Missing magic header")
                }

                // 2. Read Version (1 byte)
                val version = fis.read()
                if (version != CURRENT_VERSION.toInt()) {
                    fis.close()
                    throw IllegalArgumentException("Unsupported vault file version: $version")
                }

                // 3. Read IV length (1 byte) and IV
                val ivLength = fis.read()
                if (ivLength != GCM_IV_LENGTH) {
                    fis.close()
                    throw IllegalArgumentException("Invalid IV length in vault file: $ivLength")
                }
                val iv = ByteArray(GCM_IV_LENGTH)
                if (fis.read(iv) != GCM_IV_LENGTH) {
                    fis.close()
                    throw IllegalArgumentException("Failed to read IV from vault file")
                }

                // 4. Initialize Cipher in DECRYPT_MODE
                val masterKey = getOrCreateMasterKey()
                val cipher = Cipher.getInstance(TRANSFORMATION)
                val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
                cipher.init(Cipher.DECRYPT_MODE, masterKey, spec)

                // 5. Output to private cache directory
                val cacheDir = File(reactContext.cacheDir, "vault_decrypted")
                if (!cacheDir.exists()) {
                    cacheDir.mkdirs()
                }

                val uniquePrefix = UUID.randomUUID().toString().substring(0, 8)
                val safeOutName = outputFileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                tempDecryptedFile = File(cacheDir, "${uniquePrefix}_$safeOutName")

                val cis = CipherInputStream(fis, cipher)
                val fos = FileOutputStream(tempDecryptedFile)

                try {
                    val buffer = ByteArray(BUFFER_SIZE)
                    var bytesRead: Int
                    while (cis.read(buffer).also { bytesRead = it } != -1) {
                        fos.write(buffer, 0, bytesRead)
                    }
                    fos.flush()
                } finally {
                    fos.close()
                    cis.close()
                    fis.close()
                }

                val result: WritableMap = Arguments.createMap().apply {
                    putString("decryptedPath", tempDecryptedFile.absolutePath)
                    putString("decryptedUri", "file://${tempDecryptedFile.absolutePath}")
                    putString("fileName", tempDecryptedFile.name)
                    putDouble("decryptedSize", tempDecryptedFile.length().toDouble())
                }

                promise.resolve(result)
            } catch (e: Exception) {
                // If decryption failed, clean up any partially written temporary file
                tempDecryptedFile?.delete()
                promise.reject("DECRYPTION_ERROR", "Failed to decrypt vault file: ${e.message}", e)
            }
        }
    }

    /**
     * Deletes all temporary decrypted files in the private app cache.
     * Invoked when the vault is locked or app is backgrounded.
     */
    @ReactMethod
    fun cleanDecryptedFiles(promise: Promise) {
        ioScope.launch {
            try {
                val cacheDir = File(reactContext.cacheDir, "vault_decrypted")
                var deletedCount = 0
                if (cacheDir.exists() && cacheDir.isDirectory) {
                    cacheDir.listFiles()?.forEach { file ->
                        if (file.isFile && file.delete()) {
                            deletedCount++
                        }
                    }
                }
                promise.resolve(deletedCount)
            } catch (e: Exception) {
                promise.reject("CLEAN_ERROR", "Failed to clean decrypted files: ${e.message}", e)
            }
        }
    }

    /**
     * Deletes a specific decrypted temporary file after session close.
     */
    @ReactMethod
    fun cleanDecryptedFile(filePath: String, promise: Promise) {
        ioScope.launch {
            try {
                val file = File(filePath)
                val cacheDir = File(reactContext.cacheDir, "vault_decrypted")
                if (file.exists() && file.canonicalPath.startsWith(cacheDir.canonicalPath)) {
                    val deleted = file.delete()
                    promise.resolve(deleted)
                } else {
                    promise.resolve(false)
                }
            } catch (e: Exception) {
                promise.reject("CLEAN_FILE_ERROR", "Failed to clean decrypted file: ${e.message}", e)
            }
        }
    }

    /**
     * Deletes an encrypted file from the vault.
     */
    @ReactMethod
    fun deleteVaultFile(encryptedPath: String, promise: Promise) {
        ioScope.launch {
            try {
                val file = File(encryptedPath)
                if (file.exists()) {
                    val deleted = file.delete()
                    promise.resolve(deleted)
                } else {
                    promise.resolve(false)
                }
            } catch (e: Exception) {
                promise.reject("DELETE_ERROR", "Failed to delete vault file: ${e.message}", e)
            }
        }
    }

    /**
     * Toggles WindowManager.LayoutParams.FLAG_SECURE to prevent screenshots
     * and hide sensitive vault content from the Android recent-apps switcher.
     */
    @ReactMethod
    fun setSecureFlag(enable: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = reactApplicationContext.currentActivity
                if (activity != null) {
                    if (enable) {
                        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    } else {
                        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } catch (e: Exception) {
                promise.reject("FLAG_SECURE_ERROR", e.message, e)
            }
        }
    }
}
