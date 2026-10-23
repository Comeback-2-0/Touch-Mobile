const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-pager-view',
  'android',
  'src',
  'fabric',
  'java',
  'com',
  'reactnativepagerview',
  'PagerViewViewManager.kt'
);

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');

  // Fix 1: When args is non-null but passed to delegate expecting non-null String and ReadableArray
  const oldCode = `    override fun receiveCommand(root: NestedScrollableHost, commandId: String?, args: ReadableArray?) {
        mDelegate.receiveCommand(root, commandId, args)
    }`;

  const newCode = `    override fun receiveCommand(root: NestedScrollableHost, commandId: String?, args: ReadableArray?) {
        if (commandId != null && args != null) {
            mDelegate.receiveCommand(root, commandId, args)
        }
    }`;

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('[patch-pager-view] Successfully patched PagerViewViewManager.kt');
  } else if (content.includes('if (commandId != null && args != null)')) {
    console.log('[patch-pager-view] PagerViewViewManager.kt is already patched.');
  } else {
    console.warn('[patch-pager-view] Target snippet not found in PagerViewViewManager.kt');
  }
} else {
  // node_modules might not have react-native-pager-view in non-react-native environments
  console.log('[patch-pager-view] PagerViewViewManager.kt does not exist, skipping.');
}
