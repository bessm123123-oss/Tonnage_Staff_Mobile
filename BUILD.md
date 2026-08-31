# Сборка TONNAGE Mobile

Проект рассчитан на Expo SDK 54.

Если разворачивается новый чистый Expo-проект, установи используемые приложением зависимости через `expo install`, чтобы Expo сам подобрал совместимые версии:

```bash
npx expo install expo-sqlite react-native-safe-area-context react-native-pager-view expo-notifications expo-haptics expo-file-system expo-document-picker expo-sharing
```

Основной исходник — `App.tsx`.

Профиль сборки APK уже лежит в `eas.json`.

Сборка APK через EAS:

```bash
EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli@latest build -p android --profile preview
```

Android application id текущей линии: `com.diesel.workoutlog`.

Для обновлений поверх уже установленного приложения необходимо сохранять тот же application id и тот же EAS Android keystore.
