package com.universaldocs

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min

class PdfAnnotationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "PdfAnnotationModule"
        private const val TAG = "PdfAnnotationModule"
    }

    private val executor = Executors.newFixedThreadPool(2)

    override fun getName(): String = MODULE_NAME

    private fun getStorageDir(): File {
        val dir = File(reactContext.filesDir, "UniversalDocs")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun getAnnotationsDir(): File {
        val dir = File(getStorageDir(), ".annotations")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun parseColorSafe(colorStr: String?, defaultColor: Int): Int {
        if (colorStr.isNullOrBlank()) return defaultColor
        return try {
            Color.parseColor(colorStr.trim())
        } catch (_: Exception) {
            defaultColor
        }
    }

    /**
     * Resolves a URI (content://, file://, or raw path) to an openable ParcelFileDescriptor.
     */
    private fun openDescriptor(uriString: String): Pair<ParcelFileDescriptor?, File?> {
        val uri = Uri.parse(uriString)
        var pfd: ParcelFileDescriptor? = null
        var tempFile: File? = null

        if (uri.scheme.equals("content", ignoreCase = true)) {
            try {
                pfd = reactContext.contentResolver.openFileDescriptor(uri, "r")
            } catch (e: Exception) {
                Log.w(TAG, "Direct content descriptor open failed, trying stream: ${e.message}")
            }

            if (pfd == null) {
                val tempDir = File(reactContext.cacheDir, "pdf_annot_temp")
                if (!tempDir.exists()) tempDir.mkdirs()
                tempFile = File(tempDir, "source_${System.currentTimeMillis()}_${(1000..9999).random()}.pdf")

                reactContext.contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(tempFile).use { output ->
                        input.copyTo(output)
                    }
                }
                if (tempFile.exists() && tempFile.length() > 0) {
                    pfd = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY)
                }
            }
        } else {
            val path = if (uri.scheme.equals("file", ignoreCase = true)) {
                uri.path ?: uriString.removePrefix("file://")
            } else {
                uriString
            }
            val file = File(path)
            if (file.exists()) {
                pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            }
        }

        return Pair(pfd, tempFile)
    }

    /**
     * Generates a real, flattened, modified PDF incorporating all user annotations.
     * Original PDF pages are rendered and annotated onto a new PdfDocument.
     * The original PDF is left completely intact.
     */
    @ReactMethod
    fun generateAnnotatedPdf(
        originalUriOrPath: String,
        annotationsJson: String,
        fileNameParam: String?,
        promise: Promise
    ) {
        executor.execute {
            var pfd: ParcelFileDescriptor? = null
            var tempFile: File? = null
            var renderer: PdfRenderer? = null
            var pdfDocument: PdfDocument? = null

            try {
                if (originalUriOrPath.isBlank()) {
                    promise.reject("INVALID_URI", "Original PDF path is empty.")
                    return@execute
                }

                val descPair = openDescriptor(originalUriOrPath)
                pfd = descPair.first
                tempFile = descPair.second

                if (pfd == null) {
                    promise.reject("OPEN_FAILED", "Could not obtain file descriptor for source PDF: $originalUriOrPath")
                    return@execute
                }

                try {
                    renderer = PdfRenderer(pfd)
                } catch (e: Exception) {
                    promise.reject("RENDERER_INIT_FAILED", "Failed to initialize native renderer: ${e.message}", e)
                    return@execute
                }

                val pageCount = renderer.pageCount
                if (pageCount <= 0) {
                    promise.reject("EMPTY_PDF", "Source PDF has 0 pages.")
                    return@execute
                }

                // Parse annotations JSON and group by pageIndex
                val pageAnnotationsMap = HashMap<Int, MutableList<JSONObject>>()
                if (annotationsJson.isNotBlank()) {
                    try {
                        val array = JSONArray(annotationsJson)
                        for (i in 0 until array.length()) {
                            val annot = array.optJSONObject(i) ?: continue
                            val pageIdx = annot.optInt("pageIndex", -1)
                            if (pageIdx in 0 until pageCount) {
                                val list = pageAnnotationsMap.getOrPut(pageIdx) { ArrayList() }
                                list.add(annot)
                            }
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error parsing annotations JSON: ${e.message}")
                    }
                }

                // Generate collision-safe output filename
                val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                var cleanName = (fileNameParam ?: "Document_Edited_$dateStr").trim()
                if (!cleanName.endsWith(".pdf", ignoreCase = true)) {
                    cleanName += ".pdf"
                }

                // Handle file collision safely (do not overwrite)
                var destFile = File(getStorageDir(), cleanName)
                if (destFile.exists()) {
                    val baseName = cleanName.removeSuffix(".pdf")
                    var counter = 1
                    while (destFile.exists()) {
                        destFile = File(getStorageDir(), "${baseName}_$counter.pdf")
                        counter++
                    }
                    cleanName = destFile.name
                }

                pdfDocument = PdfDocument()

                // Render each page with annotations
                for (pageIdx in 0 until pageCount) {
                    val originalPage = renderer.openPage(pageIdx)
                    val pw = originalPage.width
                    val ph = originalPage.height

                    // Render page at 2.0x scale (max 2400px) for crisp vector reproduction
                    val scaleFactor = min(2.0f, 2400f / max(pw, ph).toFloat()).coerceAtLeast(1.0f)
                    val bmW = (pw * scaleFactor).toInt().coerceAtLeast(1)
                    val bmH = (ph * scaleFactor).toInt().coerceAtLeast(1)

                    val pageBitmap = Bitmap.createBitmap(bmW, bmH, Bitmap.Config.ARGB_8888)
                    val canvas = Canvas(pageBitmap)
                    canvas.drawColor(Color.WHITE)

                    // Render underlying original PDF page
                    originalPage.render(pageBitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
                    originalPage.close()

                    // Draw annotations for this page if any
                    val pageAnnots = pageAnnotationsMap[pageIdx]
                    if (!pageAnnots.isNullOrEmpty()) {
                        for (annot in pageAnnots) {
                            drawAnnotationOnCanvas(canvas, annot, bmW, bmH, scaleFactor)
                        }
                    }

                    // Write page to new PdfDocument preserving original page dimensions
                    val pageInfo = PdfDocument.PageInfo.Builder(pw, ph, pageIdx + 1).create()
                    val docPage = pdfDocument.startPage(pageInfo)
                    val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
                    docPage.canvas.drawBitmap(pageBitmap, null, RectF(0f, 0f, pw.toFloat(), ph.toFloat()), paint)
                    pdfDocument.finishPage(docPage)

                    pageBitmap.recycle()
                }

                // Write output file
                FileOutputStream(destFile).use { fos ->
                    pdfDocument.writeTo(fos)
                }

                // Also persist sidecar structured annotations for lossless re-editing
                val sidecarName = "${cleanName.removeSuffix(".pdf")}.annotations.json"
                val sidecarFile = File(getAnnotationsDir(), sidecarName)
                try {
                    sidecarFile.writeText(annotationsJson)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to write annotations sidecar: ${e.message}")
                }

                val finalSize = destFile.length()
                val result = Arguments.createMap().apply {
                    putString("filePath", destFile.absolutePath)
                    putString("uri", "file://${destFile.absolutePath}")
                    putString("fileName", cleanName)
                    putInt("pageCount", pageCount)
                    putDouble("size", finalSize.toDouble())
                    putString("annotationsSidecar", sidecarFile.absolutePath)
                }

                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "generateAnnotatedPdf failed: ${e.message}", e)
                promise.reject("SAVE_FAILED", "Could not generate annotated PDF: ${e.message}", e)
            } finally {
                try { renderer?.close() } catch (_: Exception) {}
                try { pdfDocument?.close() } catch (_: Exception) {}
                try { pfd?.close() } catch (_: Exception) {}
                try { tempFile?.delete() } catch (_: Exception) {}
            }
        }
    }

    /**
     * Draws an individual annotation onto the high-resolution page canvas.
     */
    private fun drawAnnotationOnCanvas(
        canvas: Canvas,
        annot: JSONObject,
        bmW: Int,
        bmH: Int,
        scaleFactor: Float
    ) {
        val type = annot.optString("type", "").lowercase(Locale.ROOT)
        val annotStyle = annot.optJSONObject("style") ?: JSONObject()
        val colorHex = annotStyle.optString("color", "#FACC15")
        val opacity = annotStyle.optDouble("opacity", 1.0).toFloat().coerceIn(0f, 1f)
        val strokeWidth = annotStyle.optDouble("strokeWidth", 3.0).toFloat().coerceAtLeast(1f)

        when (type) {
            "highlight" -> {
                val bounds = annot.optJSONObject("bounds") ?: return
                val nx = bounds.optDouble("x", 0.0).toFloat().coerceIn(0f, 1f)
                val ny = bounds.optDouble("y", 0.0).toFloat().coerceIn(0f, 1f)
                val nw = bounds.optDouble("width", 0.0).toFloat().coerceIn(0f, 1f)
                val nh = bounds.optDouble("height", 0.0).toFloat().coerceIn(0f, 1f)

                val left = nx * bmW
                val top = ny * bmH
                val right = left + (nw * bmW)
                val bottom = top + (nh * bmH)

                val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.FILL
                    color = parseColorSafe(colorHex, Color.YELLOW)
                    alpha = (opacity * 255).toInt().coerceIn(40, 220)
                    // Multiply xfermode lets underlying text stay clear & sharp
                    xfermode = PorterDuffXfermode(PorterDuff.Mode.MULTIPLY)
                }

                canvas.drawRect(left, top, right, bottom, paint)
            }

            "underline" -> {
                val bounds = annot.optJSONObject("bounds") ?: return
                val nx = bounds.optDouble("x", 0.0).toFloat().coerceIn(0f, 1f)
                val ny = bounds.optDouble("y", 0.0).toFloat().coerceIn(0f, 1f)
                val nw = bounds.optDouble("width", 0.0).toFloat().coerceIn(0f, 1f)
                val nh = bounds.optDouble("height", 0.0).toFloat().coerceIn(0f, 1f)

                val left = nx * bmW
                val right = left + (nw * bmW)
                val bottom = (ny + nh) * bmH

                val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.STROKE
                    color = parseColorSafe(colorHex, Color.BLUE)
                    this.strokeWidth = strokeWidth * scaleFactor
                    strokeCap = Paint.Cap.ROUND
                }

                canvas.drawLine(left, bottom, right, bottom, paint)
            }

            "strikethrough" -> {
                val bounds = annot.optJSONObject("bounds") ?: return
                val nx = bounds.optDouble("x", 0.0).toFloat().coerceIn(0f, 1f)
                val ny = bounds.optDouble("y", 0.0).toFloat().coerceIn(0f, 1f)
                val nw = bounds.optDouble("width", 0.0).toFloat().coerceIn(0f, 1f)
                val nh = bounds.optDouble("height", 0.0).toFloat().coerceIn(0f, 1f)

                val left = nx * bmW
                val right = left + (nw * bmW)
                val midY = (ny + (nh / 2f)) * bmH

                val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.STROKE
                    color = parseColorSafe(colorHex, Color.RED)
                    this.strokeWidth = strokeWidth * scaleFactor
                    strokeCap = Paint.Cap.ROUND
                }

                canvas.drawLine(left, midY, right, midY, paint)
            }

            "ink" -> {
                val points = annot.optJSONArray("points") ?: return
                if (points.length() < 2) return

                val path = Path()
                val p0 = points.optJSONObject(0) ?: return
                path.moveTo(p0.optDouble("x", 0.0).toFloat() * bmW, p0.optDouble("y", 0.0).toFloat() * bmH)

                for (i in 1 until points.length()) {
                    val p = points.optJSONObject(i) ?: continue
                    path.lineTo(p.optDouble("x", 0.0).toFloat() * bmW, p.optDouble("y", 0.0).toFloat() * bmH)
                }

                val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.STROKE
                    color = parseColorSafe(colorHex, Color.BLACK)
                    this.strokeWidth = strokeWidth * scaleFactor
                    strokeCap = Paint.Cap.ROUND
                    strokeJoin = Paint.Join.ROUND
                    alpha = (opacity * 255).toInt().coerceIn(0, 255)
                }

                canvas.drawPath(path, paint)
            }

            "note" -> {
                val bounds = annot.optJSONObject("bounds") ?: return
                val nx = bounds.optDouble("x", 0.0).toFloat().coerceIn(0f, 1f)
                val ny = bounds.optDouble("y", 0.0).toFloat().coerceIn(0f, 1f)

                val cx = nx * bmW
                val cy = ny * bmH
                val noteSize = 24f * scaleFactor

                // Draw yellow sticky note badge
                val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.FILL
                    color = parseColorSafe(colorHex, Color.rgb(245, 158, 11))
                }
                val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.STROKE
                    color = Color.rgb(180, 83, 9)
                    this.strokeWidth = 1.5f * scaleFactor
                }

                val rect = RectF(cx, cy, cx + noteSize, cy + noteSize)
                canvas.drawRoundRect(rect, 4f * scaleFactor, 4f * scaleFactor, bgPaint)
                canvas.drawRoundRect(rect, 4f * scaleFactor, 4f * scaleFactor, borderPaint)

                // Draw folded corner indicator
                val foldPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    style = Paint.Style.FILL
                    color = Color.rgb(217, 119, 6)
                }
                val foldPath = Path().apply {
                    moveTo(cx + noteSize - (6f * scaleFactor), cy)
                    lineTo(cx + noteSize, cy + (6f * scaleFactor))
                    lineTo(cx + noteSize - (6f * scaleFactor), cy + (6f * scaleFactor))
                    close()
                }
                canvas.drawPath(foldPath, foldPaint)
            }
        }
    }

    /**
     * Persists annotation metadata to local file storage.
     */
    @ReactMethod
    fun saveAnnotationMetadata(documentId: String, annotationsJson: String, promise: Promise) {
        executor.execute {
            try {
                val file = File(getAnnotationsDir(), "${documentId}.annotations.json")
                file.writeText(annotationsJson)
                promise.resolve(true)
            } catch (e: Exception) {
                Log.w(TAG, "saveAnnotationMetadata error: ${e.message}")
                promise.reject("SAVE_META_ERROR", e.message, e)
            }
        }
    }

    /**
     * Loads annotation metadata from local file storage if available.
     */
    @ReactMethod
    fun loadAnnotationMetadata(documentId: String, promise: Promise) {
        executor.execute {
            try {
                val file = File(getAnnotationsDir(), "${documentId}.annotations.json")
                if (file.exists()) {
                    val content = file.readText()
                    promise.resolve(content)
                } else {
                    promise.resolve("[]")
                }
            } catch (e: Exception) {
                Log.w(TAG, "loadAnnotationMetadata error: ${e.message}")
                promise.reject("LOAD_META_ERROR", e.message, e)
            }
        }
    }
}
