package com.universaldocs

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.Window
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class AndroidNavigationBarModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        const val MODULE_NAME = "AndroidNavigationBarModule"
        private var lastColorHex: String? = null
        private var lastIsLight: Boolean? = null

        fun applyNavigationBar(activity: Activity, colorHex: String, isLight: Boolean) {
            lastColorHex = colorHex
            lastIsLight = isLight
            UiThreadUtil.runOnUiThread {
                try {
                    val window: Window = activity.window
                    val parsedColor = Color.parseColor(colorHex)
                    window.navigationBarColor = parsedColor

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        window.isNavigationBarContrastEnforced = false
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val decorView: View = window.decorView
                        decorView.post {
                            try {
                                val insetsController = WindowInsetsControllerCompat(window, decorView)
                                insetsController.isAppearanceLightNavigationBars = isLight
                            } catch (_: Exception) {}
                        }
                    }
                } catch (_: Exception) {}
            }
        }
    }

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun setNavigationBarTheme(colorHex: String, isLight: Boolean, promise: Promise) {
        lastColorHex = colorHex
        lastIsLight = isLight

        UiThreadUtil.runOnUiThread {
            try {
                val activity: Activity? = reactApplicationContext.currentActivity
                if (activity == null) {
                    promise.resolve(false)
                    return@runOnUiThread
                }
                applyNavigationBar(activity, colorHex, isLight)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_NAV_BAR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun setSystemBarsTheme(
        statusBarColorHex: String,
        isLightStatusBar: Boolean,
        navBarColorHex: String,
        isLightNavBar: Boolean,
        promise: Promise
    ) {
        lastColorHex = navBarColorHex
        lastIsLight = isLightNavBar

        UiThreadUtil.runOnUiThread {
            try {
                val activity: Activity? = reactApplicationContext.currentActivity
                if (activity == null) {
                    promise.resolve(false)
                    return@runOnUiThread
                }
                val window: Window = activity.window
                val statusColor = Color.parseColor(statusBarColorHex)
                val navColor = Color.parseColor(navBarColorHex)

                window.statusBarColor = statusColor
                window.navigationBarColor = navColor

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.isNavigationBarContrastEnforced = false
                }

                val decorView: View = window.decorView
                decorView.post {
                    try {
                        val insetsController = WindowInsetsControllerCompat(window, decorView)
                        insetsController.isAppearanceLightStatusBars = isLightStatusBar
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            insetsController.isAppearanceLightNavigationBars = isLightNavBar
                        }
                    } catch (_: Exception) {}
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_SYSTEM_BARS", e.message, e)
            }
        }
    }

    override fun onHostResume() {
        val colorHex = lastColorHex ?: return
        val isLight = lastIsLight ?: return
        val activity = reactApplicationContext.currentActivity ?: return
        applyNavigationBar(activity, colorHex, isLight)
    }

    override fun onHostPause() {}
    override fun onHostDestroy() {}
}
