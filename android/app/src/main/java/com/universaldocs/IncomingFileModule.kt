package com.universaldocs

import android.app.Activity
import android.content.ContentResolver
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import androidx.core.content.ContextCompat
import java.io.File

class IncomingFileModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val TAG = "IncomingFileModule"
        const val MODULE_NAME = "IncomingFileModule"
        const val EVENT_INCOMING_FILE = "onIncomingFile"

        @Volatile
        var instance: IncomingFileModule? = null

        @Volatile
        var cachedInitialIntent: Intent? = null

        fun setInitialIntent(intent: Intent?) {
            if (intent != null) {
                cachedInitialIntent = intent
            }
        }

        fun handleIncomingIntent(intent: Intent?) {
            if (intent != null) {
                cachedInitialIntent = intent
                instance?.processIncomingIntent(intent, isNewIntent = true)
            }
        }
    }

    private var initialIntentConsumed = false
    private var lastProcessedUri: String? = null
    private var lastProcessedTime: Long = 0L

    init {
        instance = this
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    override fun invalidate() {
        super.invalidate()
        reactContext.removeActivityEventListener(this)
        if (instance == this) {
            instance = null
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        // Not used
    }

    override fun onNewIntent(intent: Intent) {
        processIncomingIntent(intent, isNewIntent = true)
    }

    /**
     * Checks the initial intent that launched the application.
     * Returns file metadata if launched via document opening, or null otherwise.
     */
    @ReactMethod
    fun getInitialFile(promise: Promise) {
        try {
            if (initialIntentConsumed) {
                promise.resolve(null)
                return
            }

            val currentActivity = reactApplicationContext.currentActivity
            val intent = cachedInitialIntent ?: currentActivity?.intent
            if (intent == null) {
                promise.resolve(null)
                return
            }

            val metadata = extractFileMetadata(intent)
            if (metadata != null) {
                initialIntentConsumed = true
                promise.resolve(metadata)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting initial file", e)
            promise.reject("INITIAL_FILE_ERROR", e.message, e)
        }
    }

    /**
     * Clears initial file state so subsequent checks do not re-process.
     */
    @ReactMethod
    fun clearInitialFile(promise: Promise) {
        initialIntentConsumed = true
        cachedInitialIntent = null
        promise.resolve(true)
    }

    /**
     * Resolves metadata for any given URI (content:// or file://).
     */
    @ReactMethod
    fun resolveUri(uriString: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val metadata = resolveUriMetadata(uri, null, null)
            if (metadata != null) {
                promise.resolve(metadata)
            } else {
                promise.reject("URI_RESOLUTION_FAILED", "Could not resolve metadata for URI: $uriString")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving URI: $uriString", e)
            promise.reject("RESOLVE_URI_ERROR", e.message, e)
        }
    }

    /**
     * Attempts to take persistable read and write URI permissions for SAF content URIs.
     */
    @ReactMethod
    fun takePersistableUriPermission(uriString: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            if (ContentResolver.SCHEME_CONTENT.equals(uri.scheme, ignoreCase = true)) {
                val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                reactContext.contentResolver.takePersistableUriPermission(uri, flags)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not take persistable URI permission: ${e.message}")
            promise.resolve(false)
        }
    }

    /**
     * Checks if the app has external storage / all files access.
     */
    @ReactMethod
    fun hasAllFilesAccess(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                promise.resolve(Environment.isExternalStorageManager())
            } else {
                val readPerm = ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    android.Manifest.permission.READ_EXTERNAL_STORAGE
                )
                promise.resolve(readPerm == android.content.pm.PackageManager.PERMISSION_GRANTED)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Prompts the user to grant storage access (All Files Access on Android 11+ or App settings).
     */
    @ReactMethod
    fun requestAllFilesAccess(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("REQUEST_PERMISSION_ERROR", e.message, e)
        }
    }

    /**
     * Lists real files and folders inside a given filesystem directory path.
     */
    @ReactMethod
    fun listFiles(directoryPath: String, promise: Promise) {
        try {
            val dir = File(directoryPath)
            if (!dir.exists()) {
                promise.reject("DIR_NOT_FOUND", "Directory does not exist: $directoryPath")
                return
            }
            if (!dir.isDirectory) {
                promise.reject("NOT_A_DIR", "Path is not a directory: $directoryPath")
                return
            }

            val files = dir.listFiles()
            val array = Arguments.createArray()
            if (files != null) {
                for (file in files) {
                    val map = Arguments.createMap().apply {
                        putString("name", file.name)
                        putString("path", file.absolutePath)
                        putString("uri", Uri.fromFile(file).toString())
                        putDouble("size", if (file.isFile) file.length().toDouble() else 0.0)
                        putDouble("modifiedAt", file.lastModified().toDouble())
                        putBoolean("isDirectory", file.isDirectory)
                        putBoolean("isFile", file.isFile)
                        val ext = file.extension.lowercase()
                        putString("extension", ext)
                        if (file.isDirectory) {
                            putString("mimeType", "resource/folder")
                            val childCount = file.list()?.size ?: 0
                            putInt("itemCount", childCount)
                        } else {
                            val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
                                ?: "application/octet-stream"
                            putString("mimeType", mime)
                        }
                    }
                    array.pushMap(map)
                }
            }
            promise.resolve(array)
        } catch (e: Exception) {
            Log.e(TAG, "Error listing files in $directoryPath", e)
            promise.reject("LIST_FILES_ERROR", e.message, e)
        }
    }

    /**
     * Lists children of a Storage Access Framework (SAF) document tree URI (content://).
     */
    @ReactMethod
    fun listDocumentTree(treeUriString: String, documentId: String?, promise: Promise) {
        try {
            val treeUri = Uri.parse(treeUriString)
            val docId = if (documentId.isNullOrBlank()) {
                DocumentsContract.getTreeDocumentId(treeUri)
            } else {
                documentId
            }
            val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, docId)
            val cr = reactApplicationContext.contentResolver
            val projection = arrayOf(
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_SIZE,
                DocumentsContract.Document.COLUMN_LAST_MODIFIED
            )
            val cursor = cr.query(childrenUri, projection, null, null, null)
            val array = Arguments.createArray()
            if (cursor != null) {
                val idIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                val nameIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                val mimeIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE)
                val sizeIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_SIZE)
                val modIdx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED)

                while (cursor.moveToNext()) {
                    val childId = cursor.getString(idIdx)
                    val name = cursor.getString(nameIdx) ?: "Untitled"
                    val mimeType = cursor.getString(mimeIdx) ?: "application/octet-stream"
                    val isDir = DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType, ignoreCase = true)
                    val size = if (sizeIdx != -1 && !cursor.isNull(sizeIdx)) cursor.getLong(sizeIdx) else 0L
                    val modifiedAt = if (modIdx != -1 && !cursor.isNull(modIdx)) cursor.getLong(modIdx) else 0L

                    val itemUri = if (isDir) {
                        DocumentsContract.buildTreeDocumentUri(treeUri.authority, childId).toString()
                    } else {
                        DocumentsContract.buildDocumentUriUsingTree(treeUri, childId).toString()
                    }

                    val ext = name.substringAfterLast('.', "").lowercase()

                    val map = Arguments.createMap().apply {
                        putString("id", childId)
                        putString("name", name)
                        putString("path", itemUri)
                        putString("uri", itemUri)
                        putString("extension", if (isDir) "" else ext)
                        putString("mimeType", mimeType)
                        putDouble("size", size.toDouble())
                        putDouble("modifiedAt", modifiedAt.toDouble())
                        putBoolean("isDirectory", isDir)
                        putBoolean("isFile", !isDir)
                    }
                    array.pushMap(map)
                }
                cursor.close()
            }
            promise.resolve(array)
        } catch (e: Exception) {
            Log.e(TAG, "Error listing document tree $treeUriString", e)
            promise.reject("DOCUMENT_TREE_ERROR", e.message, e)
        }
    }

    /**
     * Returns standard Android public directory paths.
     */
    @ReactMethod
    fun getDefaultDirectories(promise: Promise) {
        try {
            val map = Arguments.createMap().apply {
                putString("download", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)?.absolutePath ?: "/storage/emulated/0/Download")
                putString("documents", Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)?.absolutePath ?: "/storage/emulated/0/Documents")
                putString("externalStorage", Environment.getExternalStorageDirectory()?.absolutePath ?: "/storage/emulated/0")
                putString("appInternal", reactApplicationContext.filesDir.absolutePath)
                putString("appExternal", reactApplicationContext.getExternalFilesDir(null)?.absolutePath ?: reactApplicationContext.filesDir.absolutePath)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_DEFAULT_DIRS_ERROR", e.message, e)
        }
    }

    /**
     * Required for React Native NativeEventEmitter.
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep for NativeEventEmitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep for NativeEventEmitter compatibility
    }

    fun processIncomingIntent(intent: Intent, isNewIntent: Boolean = false) {
        try {
            val metadata = extractFileMetadata(intent) ?: return
            val uriStr = metadata.getString("uri")
            val now = System.currentTimeMillis()
            if (isNewIntent) {
                if (uriStr != null && uriStr == lastProcessedUri && (now - lastProcessedTime) < 1000) {
                    return
                }
                lastProcessedUri = uriStr
                lastProcessedTime = now
                sendEvent(EVENT_INCOMING_FILE, metadata)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming intent", e)
        }
    }

    private fun extractFileMetadata(intent: Intent): WritableMap? {
        val action = intent.action ?: return null

        // Check if this is a supported document action
        val isViewAction = Intent.ACTION_VIEW == action
        val isSendAction = Intent.ACTION_SEND == action
        val isEditAction = Intent.ACTION_EDIT == action
        val isOpenDocAction = "android.intent.action.OPEN_DOCUMENT" == action

        if (!isViewAction && !isSendAction && !isEditAction && !isOpenDocAction) {
            return null
        }

        // Extract Uri based on action
        val uri: Uri? = if (isSendAction) {
            @Suppress("DEPRECATION")
            (intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri)
                ?: intent.clipData?.getItemAt(0)?.uri
                ?: intent.data
        } else {
            intent.data ?: intent.clipData?.getItemAt(0)?.uri
        }

        if (uri == null) {
            return null
        }

        if (ContentResolver.SCHEME_CONTENT.equals(uri.scheme, ignoreCase = true)) {
            try {
                val takeFlags = intent.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                if (takeFlags != 0) {
                    reactContext.contentResolver.takePersistableUriPermission(uri, takeFlags)
                }
            } catch (_: Exception) {
                // Ignore if provider doesn't support persistable permissions
            }
        }

        return resolveUriMetadata(uri, intent.type, action)
    }

    private fun resolveUriMetadata(uri: Uri, intentType: String?, action: String?): WritableMap? {
        val cr: ContentResolver = reactContext.contentResolver
        var displayName: String? = null
        var fileSize: Long = -1L
        val scheme = uri.scheme ?: "unknown"

        if (ContentResolver.SCHEME_CONTENT.equals(scheme, ignoreCase = true)) {
            // Query ContentResolver for display name and size
            var cursor: Cursor? = null
            try {
                cursor = cr.query(
                    uri,
                    arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
                    null,
                    null,
                    null
                )
                if (cursor != null && cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex != -1 && !cursor.isNull(nameIndex)) {
                        displayName = cursor.getString(nameIndex)
                    }

                    val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                        fileSize = cursor.getLong(sizeIndex)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to query ContentResolver for $uri: ${e.message}")
            } finally {
                cursor?.close()
            }

            // Fallback for name from URI path
            if (displayName.isNullOrBlank()) {
                val lastSegment = uri.lastPathSegment
                if (!lastSegment.isNullOrBlank()) {
                    displayName = Uri.decode(lastSegment)
                    if (displayName.contains("/")) {
                        displayName = displayName.substringAfterLast('/')
                    }
                    if (displayName.contains(":")) {
                        displayName = displayName.substringAfterLast(':')
                    }
                }
            }
        } else if (ContentResolver.SCHEME_FILE.equals(scheme, ignoreCase = true)) {
            val path = uri.path
            if (path != null) {
                val file = File(path)
                displayName = file.name
                if (file.exists()) {
                    fileSize = file.length()
                }
            }
        }

        // Final fallback for filename
        if (displayName.isNullOrBlank()) {
            displayName = uri.lastPathSegment ?: "document"
        }

        // Determine MIME type
        var mimeType: String? = null
        if (ContentResolver.SCHEME_CONTENT.equals(scheme, ignoreCase = true)) {
            try {
                mimeType = cr.getType(uri)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to get type from ContentResolver: ${e.message}")
            }
        }

        if (mimeType.isNullOrBlank() || mimeType == "*/*" || mimeType == "application/octet-stream") {
            if (!intentType.isNullOrBlank() && intentType != "*/*" && intentType != "application/octet-stream") {
                mimeType = intentType
            } else {
                // Invert from file extension
                val ext = displayName.substringAfterLast('.', "")
                if (ext.isNotEmpty()) {
                    mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.lowercase())
                }
            }
        }

        if (mimeType.isNullOrBlank()) {
            mimeType = intentType ?: "application/octet-stream"
        }

        val map = Arguments.createMap().apply {
            putString("uri", uri.toString())
            putString("name", displayName)
            putString("mimeType", mimeType)
            putDouble("size", if (fileSize >= 0) fileSize.toDouble() else 0.0)
            putString("action", action ?: Intent.ACTION_VIEW)
            putString("scheme", scheme)
        }

        return map
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event: $eventName", e)
        }
    }
}
