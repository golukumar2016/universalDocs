package com.universaldocs

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class PdfRendererModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        const val TAG = "PdfRendererModule"
        const val MODULE_NAME = "PdfRendererModule"
    }

    private data class PdfSession(
        val id: String,
        val pfd: ParcelFileDescriptor,
        val renderer: PdfRenderer,
        val pageCount: Int,
        val tempFile: File? = null
    )

    private val sessions = ConcurrentHashMap<String, PdfSession>()
    private val executor = Executors.newFixedThreadPool(2)

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    override fun invalidate() {
        super.invalidate()
        reactContext.removeLifecycleEventListener(this)
        closeAllSessions()
    }

    override fun onHostResume() {}
    override fun onHostPause() {}
    override fun onHostDestroy() {
        closeAllSessions()
    }

    private fun closeAllSessions() {
        for ((_, session) in sessions) {
            synchronized(session) {
                try { session.renderer.close() } catch (_: Exception) {}
                try { session.pfd.close() } catch (_: Exception) {}
                try { session.tempFile?.delete() } catch (_: Exception) {}
            }
        }
        sessions.clear()
    }

    /**
     * Opens a PDF from a content:// or file:// URI.
     * Returns total page count, document ID, and page dimension metadata.
     */
    @ReactMethod
    fun openPdf(uriString: String, promise: Promise) {
        executor.execute {
            try {
                if (uriString.isBlank()) {
                    promise.reject("INVALID_URI", "Provided PDF URI is empty or blank.")
                    return@execute
                }

                val uri = Uri.parse(uriString)
                var pfd: ParcelFileDescriptor? = null
                var tempFile: File? = null

                if (uri.scheme.equals("content", ignoreCase = true)) {
                    // Step 1: Attempt direct FileDescriptor from ContentResolver
                    try {
                        pfd = reactContext.contentResolver.openFileDescriptor(uri, "r")
                    } catch (e: Exception) {
                        Log.w(TAG, "Direct content descriptor open failed, copying to temp file: ${e.message}")
                    }

                    // Step 2: Fallback to copying stream if direct descriptor is unavailable/unseekable
                    if (pfd == null) {
                        val tempDir = File(reactContext.cacheDir, "pdf_temp")
                        if (!tempDir.exists()) tempDir.mkdirs()
                        tempFile = File(tempDir, "stream_${System.currentTimeMillis()}_${(1000..9999).random()}.pdf")

                        reactContext.contentResolver.openInputStream(uri)?.use { input ->
                            tempFile.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }

                        if (!tempFile.exists() || tempFile.length() == 0L) {
                            promise.reject("FILE_NOT_FOUND", "Unable to read content URI: $uriString")
                            return@execute
                        }
                        pfd = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY)
                    }
                } else {
                    // Filesystem / file:// scheme
                    val path = if (uri.scheme.equals("file", ignoreCase = true)) {
                        uri.path ?: uriString.removePrefix("file://")
                    } else {
                        uriString
                    }
                    val file = File(path)
                    if (!file.exists()) {
                        promise.reject("FILE_NOT_FOUND", "PDF file does not exist at path: $path")
                        return@execute
                    }
                    pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                }

                if (pfd == null) {
                    promise.reject("DESCRIPTOR_FAILED", "Could not obtain file descriptor for: $uriString")
                    return@execute
                }

                // Initialize native PdfRenderer
                val renderer: PdfRenderer
                try {
                    renderer = PdfRenderer(pfd)
                } catch (secEx: SecurityException) {
                    try { pfd.close() } catch (_: Exception) {}
                    tempFile?.delete()
                    promise.reject("PASSWORD_PROTECTED", "This PDF is password protected.")
                    return@execute
                } catch (ioEx: IOException) {
                    try { pfd.close() } catch (_: Exception) {}
                    tempFile?.delete()
                    promise.reject("INVALID_PDF", "The file is not a valid PDF or is corrupted.")
                    return@execute
                } catch (e: Exception) {
                    try { pfd.close() } catch (_: Exception) {}
                    tempFile?.delete()
                    promise.reject("RENDERER_ERROR", "Failed to initialize PDF renderer: ${e.message}")
                    return@execute
                }

                val pageCount = renderer.pageCount
                if (pageCount <= 0) {
                    renderer.close()
                    try { pfd.close() } catch (_: Exception) {}
                    tempFile?.delete()
                    promise.reject("EMPTY_PDF", "The PDF contains no pages.")
                    return@execute
                }

                val docId = "pdf_${System.currentTimeMillis()}_${(1000..9999).random()}"
                val pagesArray = Arguments.createArray()

                // Extract intrinsic dimensions for all pages (quick header scan)
                for (i in 0 until pageCount) {
                    val page = renderer.openPage(i)
                    val w = page.width
                    val h = page.height
                    val map = Arguments.createMap().apply {
                        putInt("index", i)
                        putInt("pageNumber", i + 1)
                        putInt("width", w)
                        putInt("height", h)
                        putDouble("aspectRatio", if (h > 0) w.toDouble() / h.toDouble() else 1.0)
                    }
                    pagesArray.pushMap(map)
                    page.close()
                }

                val session = PdfSession(docId, pfd, renderer, pageCount, tempFile)
                sessions[docId] = session

                val result = Arguments.createMap().apply {
                    putString("documentId", docId)
                    putInt("pageCount", pageCount)
                    putArray("pages", pagesArray)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Error opening PDF $uriString: ${e.message}", e)
                promise.reject("OPEN_FAILED", "Failed to open PDF: ${e.message}", e)
            }
        }
    }

    /**
     * Renders a specific page into a cached bitmap file and returns its file:// URI.
     */
    @ReactMethod
    fun renderPage(documentId: String, pageIndex: Int, targetWidth: Int, targetHeight: Int, promise: Promise) {
        executor.execute {
            try {
                val session = sessions[documentId]
                if (session == null) {
                    promise.reject("SESSION_EXPIRED", "PDF session has expired or was closed.")
                    return@execute
                }

                if (pageIndex < 0 || pageIndex >= session.pageCount) {
                    promise.reject("INVALID_PAGE", "Page index $pageIndex is out of range [0, ${session.pageCount - 1}].")
                    return@execute
                }

                val cacheDir = File(reactContext.cacheDir, "pdf_pages/$documentId")
                if (!cacheDir.exists()) cacheDir.mkdirs()

                // Resolution-aware cached page filename
                val pageFile = File(cacheDir, "page_${pageIndex}_w${targetWidth}.png")
                if (pageFile.exists() && pageFile.length() > 0) {
                    promise.resolve("file://${pageFile.absolutePath}")
                    return@execute
                }

                val pageUri: String
                synchronized(session) {
                    val page = session.renderer.openPage(pageIndex)
                    val renderWidth = if (targetWidth > 0) targetWidth else page.width
                    val renderHeight = if (targetHeight > 0) {
                        targetHeight
                    } else {
                        if (page.width > 0) {
                            (renderWidth.toDouble() * page.height.toDouble() / page.width.toDouble()).toInt()
                        } else {
                            page.height
                        }
                    }

                    val bitmap = Bitmap.createBitmap(renderWidth, renderHeight, Bitmap.Config.ARGB_8888)
                    bitmap.eraseColor(Color.WHITE) // PDF backgrounds should be white by default
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    page.close()

                    FileOutputStream(pageFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.PNG, 95, out)
                    }
                    bitmap.recycle()
                    pageUri = "file://${pageFile.absolutePath}"
                }

                promise.resolve(pageUri)
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering page $pageIndex: ${e.message}", e)
                promise.reject("RENDER_PAGE_FAILED", "Failed to render page $pageIndex: ${e.message}", e)
            }
        }
    }

    /**
     * Closes an active PDF session, releases native descriptors, and cleans cached page images.
     */
    @ReactMethod
    fun closePdf(documentId: String, promise: Promise) {
        executor.execute {
            try {
                val session = sessions.remove(documentId)
                if (session != null) {
                    synchronized(session) {
                        try { session.renderer.close() } catch (_: Exception) {}
                        try { session.pfd.close() } catch (_: Exception) {}
                        try { session.tempFile?.delete() } catch (_: Exception) {}
                    }
                    val cacheDir = File(reactContext.cacheDir, "pdf_pages/$documentId")
                    cacheDir.deleteRecursively()
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    /**
     * Purges all temporary PDF page caches and streams.
     */
    @ReactMethod
    fun clearAllPdfCache(promise: Promise) {
        executor.execute {
            try {
                val pagesDir = File(reactContext.cacheDir, "pdf_pages")
                pagesDir.deleteRecursively()
                val tempDir = File(reactContext.cacheDir, "pdf_temp")
                tempDir.deleteRecursively()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }
}
