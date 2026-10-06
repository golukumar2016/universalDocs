package com.universaldocs

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

class DocumentScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "DocumentScannerModule"
        private const val TAG = "DocumentScannerModule"
        private const val PDF_A4_WIDTH = 595
        private const val PDF_A4_HEIGHT = 842
    }

    private val executor = Executors.newFixedThreadPool(2)

    override fun getName(): String = MODULE_NAME

    private fun getTempDir(): File {
        val dir = File(reactContext.cacheDir, "scanner_temp")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun getStorageDir(): File {
        val dir = File(reactContext.filesDir, "UniversalDocs")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun resolveFilePath(uriOrPath: String): String {
        return if (uriOrPath.startsWith("file://")) {
            uriOrPath.removePrefix("file://")
        } else if (uriOrPath.startsWith("content://")) {
            val uri = Uri.parse(uriOrPath)
            val tempFile = File(getTempDir(), "content_src_${System.currentTimeMillis()}.jpg")
            reactContext.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            tempFile.absolutePath
        } else {
            uriOrPath
        }
    }

    private fun loadOrientedBitmap(filePath: String): Bitmap? {
        val file = File(filePath)
        if (!file.exists()) return null

        val original = BitmapFactory.decodeFile(file.absolutePath) ?: return null

        var rotation = 0
        try {
            val exif = ExifInterface(file.absolutePath)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            rotation = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
        } catch (_: Exception) {}

        return if (rotation != 0) {
            val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
            val rotated = Bitmap.createBitmap(
                original, 0, 0, original.width, original.height, matrix, true
            )
            if (rotated != original) original.recycle()
            rotated
        } else {
            original
        }
    }

    /**
     * Detects document edges or computes optimal bounds for manual corner adjustment.
     */
    @ReactMethod
    fun detectDocumentEdges(imageUriOrPath: String, promise: Promise) {
        executor.execute {
            try {
                val filePath = resolveFilePath(imageUriOrPath)
                val file = File(filePath)
                if (!file.exists()) {
                    promise.reject("FILE_NOT_FOUND", "Image file not found at $imageUriOrPath")
                    return@execute
                }

                val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeFile(filePath, options)

                var width = options.outWidth
                var height = options.outHeight

                try {
                    val exif = ExifInterface(filePath)
                    val orientation = exif.getAttributeInt(
                        ExifInterface.TAG_ORIENTATION,
                        ExifInterface.ORIENTATION_NORMAL
                    )
                    if (orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
                        orientation == ExifInterface.ORIENTATION_ROTATE_270) {
                        val temp = width
                        width = height
                        height = temp
                    }
                } catch (_: Exception) {}

                if (width <= 0 || height <= 0) {
                    promise.reject("INVALID_IMAGE", "Could not decode dimensions of image.")
                    return@execute
                }

                // Default initial crop boundary with 6% margin
                val marginX = (width * 0.06f)
                val marginY = (height * 0.06f)

                val corners = Arguments.createMap().apply {
                    putMap("topLeft", Arguments.createMap().apply {
                        putDouble("x", marginX.toDouble())
                        putDouble("y", marginY.toDouble())
                    })
                    putMap("topRight", Arguments.createMap().apply {
                        putDouble("x", (width - marginX).toDouble())
                        putDouble("y", marginY.toDouble())
                    })
                    putMap("bottomRight", Arguments.createMap().apply {
                        putDouble("x", (width - marginX).toDouble())
                        putDouble("y", (height - marginY).toDouble())
                    })
                    putMap("bottomLeft", Arguments.createMap().apply {
                        putDouble("x", marginX.toDouble())
                        putDouble("y", (height - marginY).toDouble())
                    })
                }

                val result = Arguments.createMap().apply {
                    putInt("width", width)
                    putInt("height", height)
                    putString("filePath", "file://$filePath")
                    putMap("corners", corners)
                }

                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "detectDocumentEdges error: ${e.message}", e)
                promise.reject("DETECTION_ERROR", e.message, e)
            }
        }
    }

    /**
     * Performs a mathematical perspective transformation mapping 4 arbitrary quadrilateral
     * corner points to a true rectangular image using Matrix.setPolyToPoly.
     */
    @ReactMethod
    fun cropAndPerspectiveTransform(
        imageUriOrPath: String,
        corners: ReadableMap,
        promise: Promise
    ) {
        executor.execute {
            try {
                val filePath = resolveFilePath(imageUriOrPath)
                val srcBitmap = loadOrientedBitmap(filePath)
                if (srcBitmap == null) {
                    promise.reject("LOAD_FAILED", "Could not load bitmap from $imageUriOrPath")
                    return@execute
                }

                val tlMap = corners.getMap("topLeft")!!
                val trMap = corners.getMap("topRight")!!
                val brMap = corners.getMap("bottomRight")!!
                val blMap = corners.getMap("bottomLeft")!!

                val tlX = tlMap.getDouble("x").toFloat()
                val tlY = tlMap.getDouble("y").toFloat()
                val trX = trMap.getDouble("x").toFloat()
                val trY = trMap.getDouble("y").toFloat()
                val brX = brMap.getDouble("x").toFloat()
                val brY = brMap.getDouble("y").toFloat()
                val blX = blMap.getDouble("x").toFloat()
                val blY = blMap.getDouble("y").toFloat()

                // Calculate target rectangle dimensions based on corner distances
                val topWidth = hypot((trX - tlX).toDouble(), (trY - tlY).toDouble()).toFloat()
                val bottomWidth = hypot((brX - blX).toDouble(), (brY - blY).toDouble()).toFloat()
                val targetWidth = max(topWidth, bottomWidth).coerceAtLeast(100f).toInt()

                val leftHeight = hypot((blX - tlX).toDouble(), (blY - tlY).toDouble()).toFloat()
                val rightHeight = hypot((brX - trX).toDouble(), (brY - trY).toDouble()).toFloat()
                val targetHeight = max(leftHeight, rightHeight).coerceAtLeast(100f).toInt()

                val srcPoints = floatArrayOf(
                    tlX, tlY,
                    trX, trY,
                    brX, brY,
                    blX, blY
                )

                val dstPoints = floatArrayOf(
                    0f, 0f,
                    targetWidth.toFloat(), 0f,
                    targetWidth.toFloat(), targetHeight.toFloat(),
                    0f, targetHeight.toFloat()
                )

                val matrix = Matrix()
                val polySuccess = matrix.setPolyToPoly(srcPoints, 0, dstPoints, 0, 4)

                val outBitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(outBitmap)
                canvas.drawColor(Color.WHITE)

                val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)

                if (polySuccess) {
                    canvas.drawBitmap(srcBitmap, matrix, paint)
                } else {
                    // Fallback to bounding box crop if matrix singular
                    val left = min(min(tlX, trX), min(blX, brX)).coerceAtLeast(0f).toInt()
                    val top = min(min(tlY, trY), min(blY, brY)).coerceAtLeast(0f).toInt()
                    val right = max(max(tlX, trX), max(blX, brX)).coerceAtMost(srcBitmap.width.toFloat()).toInt()
                    val bottom = max(max(tlY, trY), max(blY, brY)).coerceAtMost(srcBitmap.height.toFloat()).toInt()
                    val w = (right - left).coerceAtLeast(1)
                    val h = (bottom - top).coerceAtLeast(1)

                    val cropped = Bitmap.createBitmap(srcBitmap, left, top, w, h)
                    canvas.drawBitmap(cropped, null, Rect(0, 0, targetWidth, targetHeight), paint)
                    cropped.recycle()
                }

                srcBitmap.recycle()

                val outFile = File(getTempDir(), "cropped_${System.currentTimeMillis()}.jpg")
                FileOutputStream(outFile).use { fos ->
                    outBitmap.compress(Bitmap.CompressFormat.JPEG, 92, fos)
                }
                outBitmap.recycle()

                val result = Arguments.createMap().apply {
                    putString("imagePath", "file://${outFile.absolutePath}")
                    putInt("width", targetWidth)
                    putInt("height", targetHeight)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "cropAndPerspectiveTransform error: ${e.message}", e)
                promise.reject("CROP_ERROR", e.message, e)
            }
        }
    }

    /**
     * Applies offline image enhancements: ORIGINAL, AUTO, GRAYSCALE, BLACK_AND_WHITE, HIGH_CONTRAST.
     */
    @ReactMethod
    fun enhanceImage(
        imageUriOrPath: String,
        mode: String,
        promise: Promise
    ) {
        executor.execute {
            try {
                val filePath = resolveFilePath(imageUriOrPath)
                val srcBitmap = loadOrientedBitmap(filePath)
                if (srcBitmap == null) {
                    promise.reject("LOAD_FAILED", "Could not load bitmap from $imageUriOrPath")
                    return@execute
                }

                val outBitmap = Bitmap.createBitmap(
                    srcBitmap.width, srcBitmap.height, Bitmap.Config.ARGB_8888
                )
                val canvas = Canvas(outBitmap)
                val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)

                when (mode.uppercase(Locale.ROOT)) {
                    "GRAYSCALE" -> {
                        val cm = ColorMatrix().apply { setSaturation(0f) }
                        paint.colorFilter = ColorMatrixColorFilter(cm)
                        canvas.drawBitmap(srcBitmap, 0f, 0f, paint)
                    }
                    "HIGH_CONTRAST" -> {
                        // Boost contrast + reduce saturation for clarity
                        val contrast = 1.4f
                        val translate = (-0.5f * contrast + 0.5f) * 255f
                        val contrastMatrix = ColorMatrix(floatArrayOf(
                            contrast, 0f, 0f, 0f, translate,
                            0f, contrast, 0f, 0f, translate,
                            0f, 0f, contrast, 0f, translate,
                            0f, 0f, 0f, 1f, 0f
                        ))
                        val satMatrix = ColorMatrix().apply { setSaturation(0.2f) }
                        contrastMatrix.preConcat(satMatrix)
                        paint.colorFilter = ColorMatrixColorFilter(contrastMatrix)
                        canvas.drawBitmap(srcBitmap, 0f, 0f, paint)
                    }
                    "BLACK_AND_WHITE" -> {
                        // High-contrast document binarization for text / receipts
                        val width = srcBitmap.width
                        val height = srcBitmap.height
                        val pixels = IntArray(width * height)
                        srcBitmap.getPixels(pixels, 0, width, 0, 0, width, height)

                        // Compute average luminance for adaptive threshold
                        var sumLum: Long = 0
                        for (i in pixels.indices) {
                            val c = pixels[i]
                            val r = (c shr 16) and 0xFF
                            val g = (c shr 8) and 0xFF
                            val b = c and 0xFF
                            val lum = (r * 299 + g * 587 + b * 114) / 1000
                            sumLum += lum
                        }
                        val avgLum = (sumLum / pixels.size).toInt()
                        val threshold = (avgLum * 0.92f).toInt().coerceIn(80, 180)

                        for (i in pixels.indices) {
                            val c = pixels[i]
                            val r = (c shr 16) and 0xFF
                            val g = (c shr 8) and 0xFF
                            val b = c and 0xFF
                            val lum = (r * 299 + g * 587 + b * 114) / 1000
                            pixels[i] = if (lum < threshold) Color.BLACK else Color.WHITE
                        }

                        outBitmap.setPixels(pixels, 0, width, 0, 0, width, height)
                    }
                    "AUTO" -> {
                        // Auto enhance: moderate contrast + brightness lift
                        val contrast = 1.2f
                        val translate = (-0.5f * contrast + 0.5f) * 255f + 10f
                        val matrix = ColorMatrix(floatArrayOf(
                            contrast, 0f, 0f, 0f, translate,
                            0f, contrast, 0f, 0f, translate,
                            0f, 0f, contrast, 0f, translate,
                            0f, 0f, 0f, 1f, 0f
                        ))
                        paint.colorFilter = ColorMatrixColorFilter(matrix)
                        canvas.drawBitmap(srcBitmap, 0f, 0f, paint)
                    }
                    else -> { // ORIGINAL
                        canvas.drawBitmap(srcBitmap, 0f, 0f, paint)
                    }
                }

                srcBitmap.recycle()

                val outFile = File(getTempDir(), "enhanced_${mode.lowercase(Locale.ROOT)}_${System.currentTimeMillis()}.jpg")
                FileOutputStream(outFile).use { fos ->
                    outBitmap.compress(Bitmap.CompressFormat.JPEG, 92, fos)
                }
                outBitmap.recycle()

                promise.resolve("file://${outFile.absolutePath}")
            } catch (e: Exception) {
                Log.e(TAG, "enhanceImage error: ${e.message}", e)
                promise.reject("ENHANCE_ERROR", e.message, e)
            }
        }
    }

    /**
     * Rotates an image by the specified degrees (90, 180, 270).
     */
    @ReactMethod
    fun rotateImage(imageUriOrPath: String, degrees: Int, promise: Promise) {
        executor.execute {
            try {
                val filePath = resolveFilePath(imageUriOrPath)
                val srcBitmap = loadOrientedBitmap(filePath)
                if (srcBitmap == null) {
                    promise.reject("LOAD_FAILED", "Could not load bitmap from $imageUriOrPath")
                    return@execute
                }

                val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
                val rotated = Bitmap.createBitmap(
                    srcBitmap, 0, 0, srcBitmap.width, srcBitmap.height, matrix, true
                )
                if (rotated != srcBitmap) {
                    srcBitmap.recycle()
                }

                val outFile = File(getTempDir(), "rotated_${System.currentTimeMillis()}.jpg")
                FileOutputStream(outFile).use { fos ->
                    rotated.compress(Bitmap.CompressFormat.JPEG, 92, fos)
                }
                rotated.recycle()

                promise.resolve("file://${outFile.absolutePath}")
            } catch (e: Exception) {
                Log.e(TAG, "rotateImage error: ${e.message}", e)
                promise.reject("ROTATE_ERROR", e.message, e)
            }
        }
    }

    /**
     * Generates a real multi-page PDF locally from the ordered list of scanned images.
     * Uses android.graphics.pdf.PdfDocument.
     */
    @ReactMethod
    fun generatePdfFromImages(
        imagePaths: ReadableArray,
        fileNameParam: String?,
        promise: Promise
    ) {
        executor.execute {
            try {
                if (imagePaths.size() == 0) {
                    promise.reject("NO_PAGES", "No pages provided to generate PDF.")
                    return@execute
                }

                val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                var cleanName = (fileNameParam ?: "Scanned_Document_$dateStr").trim()
                if (!cleanName.endsWith(".pdf", ignoreCase = true)) {
                    cleanName += ".pdf"
                }

                val destFile = File(getStorageDir(), cleanName)
                val pdfDocument = PdfDocument()

                for (i in 0 until imagePaths.size()) {
                    val rawPath = imagePaths.getString(i)
                    if (rawPath.isNullOrBlank()) continue

                    val filePath = resolveFilePath(rawPath)
                    val bitmap = loadOrientedBitmap(filePath) ?: continue

                    // Standard A4 dimensions
                    val pageInfo = PdfDocument.PageInfo.Builder(
                        PDF_A4_WIDTH, PDF_A4_HEIGHT, i + 1
                    ).create()
                    val page = pdfDocument.startPage(pageInfo)
                    val canvas = page.canvas

                    // Fill white background
                    canvas.drawColor(Color.WHITE)

                    // Aspect-fit image onto A4 page with 16pt margins
                    val margin = 16f
                    val availW = PDF_A4_WIDTH - (margin * 2)
                    val availH = PDF_A4_HEIGHT - (margin * 2)

                    val scale = min(availW / bitmap.width.toFloat(), availH / bitmap.height.toFloat())
                    val drawW = bitmap.width * scale
                    val drawH = bitmap.height * scale

                    val left = margin + (availW - drawW) / 2f
                    val top = margin + (availH - drawH) / 2f

                    val destRect = RectF(left, top, left + drawW, top + drawH)
                    val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
                    canvas.drawBitmap(bitmap, null, destRect, paint)

                    pdfDocument.finishPage(page)
                    bitmap.recycle()
                }

                FileOutputStream(destFile).use { fos ->
                    pdfDocument.writeTo(fos)
                }
                pdfDocument.close()

                if (!destFile.exists() || destFile.length() == 0L) {
                    promise.reject("WRITE_FAILED", "Generated PDF file is empty or missing.")
                    return@execute
                }

                val result = Arguments.createMap().apply {
                    putString("path", destFile.absolutePath)
                    putString("uri", "file://${destFile.absolutePath}")
                    putString("fileName", cleanName)
                    putInt("pageCount", imagePaths.size())
                    putDouble("size", destFile.length().toDouble())
                }

                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "generatePdfFromImages error: ${e.message}", e)
                promise.reject("PDF_GEN_ERROR", e.message, e)
            }
        }
    }

    /**
     * Cleans up temporary files generated during scanning.
     */
    @ReactMethod
    fun cleanupTemporaryImages(promise: Promise) {
        executor.execute {
            try {
                val tempDir = getTempDir()
                if (tempDir.exists() && tempDir.isDirectory) {
                    tempDir.listFiles()?.forEach { file ->
                        try { file.delete() } catch (_: Exception) {}
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CLEANUP_ERROR", e.message, e)
            }
        }
    }
}
