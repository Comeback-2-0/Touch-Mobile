#import "AppDelegate.h"

#import <Firebase.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTBundleURLProvider.h>

// Fallback weak stubs for Swift backward compatibility auto-linking in Xcode
extern "C" {
  __attribute__((weak)) void* __swift_FORCE_LOAD_$_swiftCompatibility56 = nullptr;
  __attribute__((weak)) void* __swift_FORCE_LOAD_$_swiftCompatibilityPacks = nullptr;
}

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  self.moduleName = @"Touch";
  self.dependencyProvider = [RCTAppDependencyProvider new];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // iOS 27 uses UIScene lifecycle.
  // Let SceneDelegate create the scene-backed UIWindow and mount RN into it.
  self.automaticallyLoadReactNativeWindow = NO;

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
 continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                    restorationHandler:restorationHandler];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (Class)getModuleClassFromName:(const char *)name
{
  Class moduleClass = [super getModuleClassFromName:name];
  if (moduleClass) {
    return moduleClass;
  }
  if (strcmp(name, "RNGoogleSignin") == 0) {
    return NSClassFromString(@"RNGoogleSignin");
  }
  return nil;
}

@end
