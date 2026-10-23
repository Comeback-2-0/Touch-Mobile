import UIKit
import React

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

        let window = UIWindow(windowScene: windowScene)
        self.window = window
        appDelegate.window = window

        let factory = appDelegate.reactNativeFactory
        factory.startReactNative(
            withModuleName: "Touch",
            in: window,
            initialProperties: appDelegate.initialProps,
            launchOptions: nil
        )
    }
}
