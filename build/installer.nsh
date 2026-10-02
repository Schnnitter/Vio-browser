!macro customInstall
  ; ============================================================
  ;  Регистрация Vio как браузера и обработчика файлов (HKCU)
  ; ============================================================

  ; --- 1. Приложение в списке «зарегистрированные приложения» ---
  WriteRegStr HKCU "Software\RegisteredApplications" "Vio" "Software\Vio\Capabilities"

  ; --- 2. Возможности приложения (Capabilities) ---
  WriteRegStr HKCU "Software\Vio\Capabilities" "ApplicationName" "Vio"
  WriteRegStr HKCU "Software\Vio\Capabilities" "ApplicationDescription" "Vio — современный быстрый браузер"

  ; URL-ассоциации (браузер)
  WriteRegStr HKCU "Software\Vio\Capabilities\URLAssociations" "http" "VioHTML"
  WriteRegStr HKCU "Software\Vio\Capabilities\URLAssociations" "https" "VioHTML"

  ; Файловые ассоциации — HTML-документы
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".htm" "VioHTML"
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".html" "VioHTML"
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".mhtml" "VioHTML"
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".shtml" "VioHTML"
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".xht" "VioHTML"

  ; Файловые ассоциации — PDF
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".pdf" "VioPDF"

  ; Файловые ассоциации — изображения
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".svg" "VioImage"
  WriteRegStr HKCU "Software\Vio\Capabilities\FileAssociations" ".webp" "VioImage"

  ; StartMenuInternet — чтобы Vio появился в списке браузеров
  WriteRegStr HKCU "Software\Vio\Capabilities\StartMenu" "StartMenuInternet" "Vio"

  ; --- 3. ProgID: VioHTML (HTML-документы) ---
  WriteRegStr HKCU "Software\Classes\VioHTML" "" "Vio HTML Document"
  WriteRegStr HKCU "Software\Classes\VioHTML" "FriendlyTypeName" "Vio HTML Document"
  WriteRegStr HKCU "Software\Classes\VioHTML\DefaultIcon" "" "$INSTDIR\Vio.exe,0"
  WriteRegStr HKCU "Software\Classes\VioHTML\shell\open\command" "" '"$INSTDIR\Vio.exe" "%1"'

  ; --- 4. ProgID: VioPDF (PDF-документы) ---
  WriteRegStr HKCU "Software\Classes\VioPDF" "" "Vio PDF Document"
  WriteRegStr HKCU "Software\Classes\VioPDF" "FriendlyTypeName" "Vio PDF Document"
  WriteRegStr HKCU "Software\Classes\VioPDF\DefaultIcon" "" "$INSTDIR\Vio.exe,0"
  WriteRegStr HKCU "Software\Classes\VioPDF\shell\open\command" "" '"$INSTDIR\Vio.exe" "%1"'

  ; --- 5. ProgID: VioImage (SVG, WebP) ---
  WriteRegStr HKCU "Software\Classes\VioImage" "" "Vio Image Document"
  WriteRegStr HKCU "Software\Classes\VioImage" "FriendlyTypeName" "Vio Image Document"
  WriteRegStr HKCU "Software\Classes\VioImage\DefaultIcon" "" "$INSTDIR\Vio.exe,0"
  WriteRegStr HKCU "Software\Classes\VioImage\shell\open\command" "" '"$INSTDIR\Vio.exe" "%1"'

  ; --- 6. StartMenuInternet ---
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio" "" "Vio"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio\DefaultIcon" "" "$INSTDIR\Vio.exe,0"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio\shell\open\command" "" '"$INSTDIR\Vio.exe"'
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio\Capabilities" "ApplicationName" "Vio"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio\Capabilities" "ApplicationDescription" "Vio — современный быстрый браузер"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio\Capabilities\URLAssociations" "http" "VioHTML"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\Vio\Capabilities\URLAssociations" "https" "VioHTML"

  ; --- 7. Уведомить Windows об изменении ассоциаций ---
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  ; Удаляем всё, что записали при установке
  DeleteRegValue HKCU "Software\RegisteredApplications" "Vio"
  DeleteRegKey HKCU "Software\Vio"
  DeleteRegKey HKCU "Software\Classes\VioHTML"
  DeleteRegKey HKCU "Software\Classes\VioPDF"
  DeleteRegKey HKCU "Software\Classes\VioImage"
  DeleteRegKey HKCU "Software\Clients\StartMenuInternet\Vio"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend