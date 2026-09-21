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
