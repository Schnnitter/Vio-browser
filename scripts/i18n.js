/* Vio — интерфейс на языке региона.
   Основные словари — scripts/i18n-dict.js; ручные дополнения новых строк — ниже.
   Не меняет логику: переводит только видимый текст и подписи (title/placeholder/alt).
   Контент пользователя (закладки, история, цитаты, тексты чата) не трогает. */
;(function () {
  'use strict'

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, PRE: 1, CODE: 1, NOSCRIPT: 1 }
  var ATTRS = ['title', 'placeholder', 'alt', 'aria-label']
  /* пользовательский контент — не переводить.
     Пузыри ассистента (.ai-msg.ai) переводятся: там русские шаблоны интерфейса
     и ответы модели (код в PRE/CODE не трогаем). Свои сообщения юзера — святое. */
  var SKIP_SEL = '.li-title,.si-title,#qp-list .li-sub,.sd-name,.bmb-item span,.ai-msg.user .ai-bubble'
  var CYR = /[Ѐ-ӿ]/
  var NOT_BEFORE = '(?<![\\p{L}\\p{N}_])'
  var NOT_AFTER = '(?![\\p{L}\\p{N}_])'
  var SUSPEND_NOTICE = 'Вкладка выгружена из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.'
  var FEATURE_DICT = {
    uk: {
      'Отложить вкладку': 'Призупинити вкладку',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Вкладку вивантажено з пам’яті. Під час відкриття сайт завантажиться знову; незбережені дані можуть бути втрачені.',
      'Страница отложена — нажмите, чтобы загрузить': 'Сторінку призупинено — натисніть, щоб завантажити'
    },
    hi: {
      'Отложить вкладку': 'टैब को रोकें',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'टैब को मेमोरी से हटाया गया है। खोलने पर साइट फिर से लोड होगी; सहेजा न गया डेटा खो सकता है।',
      'Страница отложена — нажмите, чтобы загрузить': 'पेज रोक दिया गया है — लोड करने के लिए क्लिक करें'
    },
    en: {
      'Отложить вкладку': 'Suspend tab',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Tab unloaded from memory. The site will reload when reopened; unsaved page data may be lost.',
      'Страница отложена — нажмите, чтобы загрузить': 'Page suspended — select to load'
    },
    de: {
      'Отложить вкладку': 'Tab in den Ruhezustand versetzen',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Der Tab wurde aus dem Speicher entladen. Beim Öffnen wird die Website neu geladen; nicht gespeicherte Daten können verloren gehen.',
      'Страница отложена — нажмите, чтобы загрузить': 'Seite angehalten — zum Laden auswählen'
    },
    fr: {
      'Отложить вкладку': 'Suspendre l’onglet',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'L’onglet a été déchargé de la mémoire. Le site sera rechargé à sa réouverture ; les données non enregistrées peuvent être perdues.',
      'Страница отложена — нажмите, чтобы загрузить': 'Page suspendue — sélectionner pour charger'
    },
    es: {
      'Отложить вкладку': 'Suspender pestaña',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'La pestaña se descargó de la memoria. El sitio se volverá a cargar al abrirla; los datos no guardados podrían perderse.',
      'Страница отложена — нажмите, чтобы загрузить': 'Página suspendida — selecciona para cargar'
    },
    it: {
      'Отложить вкладку': 'Sospendi scheda',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'La scheda è stata rimossa dalla memoria. Il sito verrà ricaricato alla riapertura; i dati non salvati potrebbero andare persi.',
      'Страница отложена — нажмите, чтобы загрузить': 'Pagina sospesa — seleziona per caricare'
    },
    pt: {
      'Отложить вкладку': 'Suspender separador',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'O separador foi removido da memória. O site será recarregado ao reabri-lo; os dados não guardados podem perder-se.',
      'Страница отложена — нажмите, чтобы загрузить': 'Página suspensa — selecione para carregar'
    },
    pl: {
      'Отложить вкладку': 'Uśpij kartę',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Karta została usunięta z pamięci. Po ponownym otwarciu strona załaduje się ponownie; niezapisane dane mogą zostać utracone.',
      'Страница отложена — нажмите, чтобы загрузить': 'Strona uśpiona — wybierz, aby wczytać'
    },
    tr: {
      'Отложить вкладку': 'Sekmeyi askıya al',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Sekme bellekten kaldırıldı. Yeniden açıldığında site tekrar yüklenir; kaydedilmemiş veriler kaybolabilir.',
      'Страница отложена — нажмите, чтобы загрузить': 'Sayfa askıya alındı — yüklemek için seçin'
    },
    nl: {
      'Отложить вкладку': 'Tabblad in slaapstand zetten',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Het tabblad is uit het geheugen verwijderd. De website wordt opnieuw geladen wanneer je het tabblad opent; niet-opgeslagen gegevens kunnen verloren gaan.',
      'Страница отложена — нажмите, чтобы загрузить': 'Pagina gepauzeerd — selecteer om te laden'
    },
    sv: {
      'Отложить вкладку': 'Pausa fliken',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Fliken har tagits bort från minnet. Webbplatsen läses in igen när fliken öppnas; osparade data kan gå förlorade.',
      'Страница отложена — нажмите, чтобы загрузить': 'Sidan är pausad — välj för att läsa in'
    },
    fi: {
      'Отложить вкладку': 'Keskeytä välilehti',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Välilehti poistettiin muistista. Sivusto latautuu uudelleen, kun välilehti avataan; tallentamattomat tiedot voivat kadota.',
      'Страница отложена — нажмите, чтобы загрузить': 'Sivu keskeytetty — valitse ladataksesi'
    },
    cs: {
      'Отложить вкладку': 'Uspat kartu',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Karta byla uvolněna z paměti. Při opětovném otevření se web načte znovu; neuložená data mohou být ztracena.',
      'Страница отложена — нажмите, чтобы загрузить': 'Stránka uspána — výběrem ji načtete'
    },
    ro: {
      'Отложить вкладку': 'Suspendă fila',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Fila a fost eliminată din memorie. Site-ul se va reîncărca la redeschidere; datele nesalvate se pot pierde.',
      'Страница отложена — нажмите, чтобы загрузить': 'Pagina este suspendată — selectează pentru încărcare'
    },
    el: {
      'Отложить вкладку': 'Αναστολή καρτέλας',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Η καρτέλα αφαιρέθηκε από τη μνήμη. Ο ιστότοπος θα φορτωθεί ξανά όταν την ανοίξετε· τα μη αποθηκευμένα δεδομένα ενδέχεται να χαθούν.',
      'Страница отложена — нажмите, чтобы загрузить': 'Η σελίδα τέθηκε σε αναστολή — επιλέξτε για φόρτωση'
    },
    be: {
      'Отложить вкладку': 'Прыпыніць укладку',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Укладка выгружана з памяці. Пры адкрыцці сайт загрузіцца зноў; незахаваныя даныя могуць згубіцца.',
      'Страница отложена — нажмите, чтобы загрузить': 'Старонка прыпынена — націсніце, каб загрузіць'
    },
    kk: {
      'Отложить вкладку': 'Қойындыны уақытша тоқтату',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'Қойынды жадтан босатылды. Қайта ашқанда сайт қайта жүктеледі; сақталмаған деректер жоғалуы мүмкін.',
      'Страница отложена — нажмите, чтобы загрузить': 'Бет уақытша тоқтатылды — жүктеу үшін таңдаңыз'
    },
    ar: {
      'Отложить вкладку': 'تعليق علامة التبويب',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'تم إلغاء تحميل علامة التبويب من الذاكرة. سيُعاد تحميل الموقع عند فتحها؛ وقد تُفقد البيانات غير المحفوظة.',
      'Страница отложена — нажмите, чтобы загрузить': 'تم تعليق الصفحة — اخترها لتحميلها'
    },
    he: {
      'Отложить вкладку': 'השהיית הכרטיסייה',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'הכרטיסייה הוסרה מהזיכרון. האתר ייטען מחדש כשתפתחו אותה; נתונים שלא נשמרו עלולים ללכת לאיבוד.',
      'Страница отложена — нажмите, чтобы загрузить': 'הדף הושהה — בחרו בו כדי לטעון אותו'
    },
    zh: {
      'Отложить вкладку': '休眠标签页',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': '标签页已从内存中卸载。重新打开时网站会重新加载；未保存的数据可能会丢失。',
      'Страница отложена — нажмите, чтобы загрузить': '页面已休眠 — 选择以重新加载'
    },
    ja: {
      'Отложить вкладку': 'タブを休止',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': 'タブをメモリから解放しました。再度開くとサイトを読み込み直します。未保存のデータは失われる場合があります。',
      'Страница отложена — нажмите, чтобы загрузить': 'ページは休止中 — 選択して読み込み'
    },
    ko: {
      'Отложить вкладку': '탭 절전',
      'Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.': '탭이 메모리에서 해제되었습니다. 다시 열면 사이트가 새로고침되며 저장하지 않은 데이터가 사라질 수 있습니다.',
      'Страница отложена — нажмите, чтобы загрузить': '페이지가 일시 중지됨 — 선택하여 로드'
    }
  }
  var SETTINGS_DICT = {
    uk: {
      'Режим чтения (Ctrl+Alt+R)': 'Режим читання (Ctrl+Alt+R)',
      'Web-панели': 'Вебпанелі',
      'Синхронизация': 'Синхронізація',
      'Память': 'Пам’ять',
      'Где показывать вкладки': 'Де показувати вкладки',
      'Восстанавливать вкладки после запуска/сбоя': 'Відновлювати вкладки після запуску/збою',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Після запуску Vio або раптового збою відкрити ті самі вкладки, що були до закриття',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Окреме сховище: файли cookie, кеш і історія не зберігаються. Після закриття останньої приватної вкладки всі дані сеансу видаляються.',
      'Очистить данные приватного режима вручную': 'Очистити дані приватного режиму вручну',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Паролі на цьому пристрої. Логін і пароль можна показати, будь-який запис — видалити',
      'Один зашифрованный файл со всеми данными профиля': 'Один зашифрований файл з усіма даними профілю',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Автоматично зберігати в хмару кожні 15 хвилин, поки Vio відкритий',
      'Память выключена': 'Пам’ять вимкнена',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Поки ви її не ввімкнете, Vio нічого не зберігає.',
      'Включить память': 'Увімкнути пам’ять',
      'Сохранять текст страниц локально': 'Зберігати текст сторінок локально',
      'Панелей пока нет.': 'Панелей поки немає.',
      'Свой CSS для сайтов': 'Власний CSS для сайтів',
      'Производительность': 'Продуктивність',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Авто — спрощує ефекти на слабких ПК; максимальна швидкість вимикає ресурсоємне оформлення',
      'Авто': 'Авто',
      'Полные эффекты': 'Усі ефекти',
      'Максимальная экономия': 'Максимальна економія',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Оберіть спокійний або анімований градієнт; анімація вмикається лише у відповідному режимі продуктивності',
      'Живая аврора': 'Жива аврора',
      'Живой океан': 'Живий океан',
      'Живой закат': 'Живий захід сонця'
    },
    hi: {
      'Режим чтения (Ctrl+Alt+R)': 'रीडर मोड (Ctrl+Alt+R)',
      'Web-панели': 'वेब पैनल',
      'Синхронизация': 'सिंक',
      'Память': 'मेमोरी',
      'Где показывать вкладки': 'टैब कहाँ दिखाएँ',
      'Восстанавливать вкладки после запуска/сбоя': 'शुरू होने या क्रैश के बाद टैब बहाल करें',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Vio शुरू होने या अचानक बंद होने के बाद पहले वाले टैब फिर खोलें',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'अलग संग्रहण: कुकी, कैश और इतिहास सहेजे नहीं जाते। आखिरी निजी टैब बंद होने पर सत्र का सारा डेटा मिटा दिया जाता है।',
      'Очистить данные приватного режима вручную': 'निजी मोड का डेटा अभी मिटाएँ',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'इस डिवाइस के पासवर्ड। लॉगिन और पासवर्ड दिखाएँ या कोई भी प्रविष्टि हटाएँ',
      'Один зашифрованный файл со всеми данными профиля': 'प्रोफ़ाइल के सभी डेटा वाली एक एन्क्रिप्टेड फ़ाइल',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Vio खुला रहने पर हर 15 मिनट में अपने-आप क्लाउड में सहेजें',
      'Память выключена': 'मेमोरी बंद है',
      'Пока вы не включите — Vio не сохраняет ничего.': 'जब तक आप इसे चालू नहीं करते, Vio कुछ भी सहेजता नहीं है।',
      'Включить память': 'मेमोरी चालू करें',
      'Сохранять текст страниц локально': 'पेज का टेक्स्ट डिवाइस पर सहेजें',
      'Панелей пока нет.': 'अभी कोई पैनल नहीं है।',
      'Свой CSS для сайтов': 'साइटों के लिए अपना CSS',
      'Производительность': 'प्रदर्शन',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'ऑटो — कमज़ोर पीसी पर प्रभाव सरल करता है; अधिकतम गति भारी सजावट बंद करती है',
      'Авто': 'ऑटो',
      'Полные эффекты': 'सभी प्रभाव',
      'Максимальная экономия': 'अधिकतम बचत',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'स्थिर या जीवंत ग्रेडिएंट चुनें; एनीमेशन केवल उपयुक्त प्रदर्शन मोड में चलता है',
      'Живая аврора': 'जीवंत ऑरोरा',
      'Живой океан': 'जीवंत महासागर',
      'Живой закат': 'जीवंत सूर्यास्त'
    },
    en: {
      'Режим чтения (Ctrl+Alt+R)': 'Reader mode (Ctrl+Alt+R)',
      'Web-панели': 'Web panels',
      'Синхронизация': 'Sync',
      'Память': 'Memory',
      'Где показывать вкладки': 'Tab position',
      'Восстанавливать вкладки после запуска/сбоя': 'Restore tabs after startup or a crash',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Reopen the same tabs after Vio starts or recovers from a crash',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Separate storage: cookies, cache and history are not saved. All session data is deleted when the last private tab closes.',
      'Очистить данные приватного режима вручную': 'Clear private-session data now',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Passwords on this device. Reveal a username and password or delete any entry',
      'Один зашифрованный файл со всеми данными профиля': 'One encrypted file containing all profile data',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Automatically save to the cloud every 15 minutes while Vio is open',
      'Память выключена': 'Memory is off',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio will not save anything unless you turn this on.',
      'Включить память': 'Enable memory',
      'Сохранять текст страниц локально': 'Save page text locally',
      'Панелей пока нет.': 'No panels yet.',
      'Свой CSS для сайтов': 'Custom CSS for websites',
      'Производительность': 'Performance',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Auto simplifies effects on low-end PCs; maximum speed disables heavy visual effects',
      'Авто': 'Auto',
      'Полные эффекты': 'Full effects',
      'Максимальная экономия': 'Maximum savings',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Choose a calm or animated gradient; animation runs only when the performance mode allows it',
      'Живая аврора': 'Living Aurora',
      'Живой океан': 'Living Ocean',
      'Живой закат': 'Living Sunset'
    },
    de: {
      'Режим чтения (Ctrl+Alt+R)': 'Lesemodus (Strg+Alt+R)',
      'Web-панели': 'Web-Panels',
      'Синхронизация': 'Synchronisierung',
      'Память': 'Speicher',
      'Где показывать вкладки': 'Position der Tabs',
      'Восстанавливать вкладки после запуска/сбоя': 'Tabs nach dem Start oder einem Absturz wiederherstellen',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Nach dem Start oder einem Absturz dieselben Tabs wie zuvor öffnen',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Getrennter Speicher: Cookies, Cache und Verlauf werden nicht gespeichert. Beim Schließen des letzten privaten Tabs werden alle Sitzungsdaten gelöscht.',
      'Очистить данные приватного режима вручную': 'Private Sitzungsdaten jetzt löschen',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Passwörter auf diesem Gerät. Benutzernamen und Passwort anzeigen oder einen Eintrag löschen',
      'Один зашифрованный файл со всеми данными профиля': 'Eine verschlüsselte Datei mit allen Profildaten',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Automatisch alle 15 Minuten in der Cloud speichern, solange Vio geöffnet ist',
      'Память выключена': 'Speicher ist deaktiviert',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio speichert nichts, solange diese Funktion nicht aktiviert ist.',
      'Включить память': 'Speicher aktivieren',
      'Сохранять текст страниц локально': 'Seitentext lokal speichern',
      'Панелей пока нет.': 'Noch keine Panels vorhanden.',
      'Свой CSS для сайтов': 'Eigenes CSS für Websites',
      'Производительность': 'Leistung',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automatisch: vereinfacht Effekte auf leistungsschwachen PCs; maximale Geschwindigkeit deaktiviert aufwendige Effekte',
      'Авто': 'Automatisch',
      'Полные эффекты': 'Volle Effekte',
      'Максимальная экономия': 'Maximale Energieeinsparung',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Wähle einen ruhigen oder animierten Farbverlauf. Animationen laufen nur bei passendem Leistungsmodus.',
      'Живая аврора': 'Animiertes Polarlicht',
      'Живой океан': 'Animierter Ozean',
      'Живой закат': 'Animierter Sonnenuntergang'
    },
    fr: {
      'Режим чтения (Ctrl+Alt+R)': 'Mode lecture (Ctrl+Alt+R)',
      'Web-панели': 'Panneaux Web',
      'Синхронизация': 'Synchronisation',
      'Память': 'Mémoire',
      'Где показывать вкладки': 'Position des onglets',
      'Восстанавливать вкладки после запуска/сбоя': 'Restaurer les onglets au démarrage ou après un plantage',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Rouvrir les mêmes onglets après le démarrage ou un plantage de Vio',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Stockage séparé : les cookies, le cache et l’historique ne sont pas enregistrés. Toutes les données de session sont supprimées à la fermeture du dernier onglet privé.',
      'Очистить данные приватного режима вручную': 'Effacer les données de la session privée',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Mots de passe de cet appareil. Afficher un identifiant et un mot de passe ou supprimer une entrée',
      'Один зашифрованный файл со всеми данными профиля': 'Un fichier chiffré contenant toutes les données du profil',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Enregistrer automatiquement dans le cloud toutes les 15 minutes pendant que Vio est ouvert',
      'Память выключена': 'La mémoire est désactivée',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio n’enregistre rien tant que vous ne l’activez pas.',
      'Включить память': 'Activer la mémoire',
      'Сохранять текст страниц локально': 'Enregistrer le texte des pages localement',
      'Панелей пока нет.': 'Aucun panneau pour le moment.',
      'Свой CSS для сайтов': 'CSS personnalisé pour les sites',
      'Производительность': 'Performances',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automatique : simplifie les effets sur les PC modestes ; la vitesse maximale désactive les effets visuels lourds',
      'Авто': 'Automatique',
      'Полные эффекты': 'Effets complets',
      'Максимальная экономия': 'Économie maximale',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Choisissez un dégradé discret ou animé ; l’animation ne s’active que si le mode de performances le permet',
      'Живая аврора': 'Aurore animée',
      'Живой океан': 'Océan animé',
      'Живой закат': 'Coucher de soleil animé'
    },
    es: {
      'Режим чтения (Ctrl+Alt+R)': 'Modo lectura (Ctrl+Alt+R)',
      'Web-панели': 'Paneles web',
      'Синхронизация': 'Sincronización',
      'Память': 'Memoria',
      'Где показывать вкладки': 'Posición de las pestañas',
      'Восстанавливать вкладки после запуска/сбоя': 'Restaurar pestañas al iniciar o después de un fallo',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Volver a abrir las mismas pestañas después de iniciar Vio o de un fallo',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Almacenamiento independiente: no se guardan cookies, caché ni historial. Al cerrar la última pestaña privada se eliminan todos los datos de la sesión.',
      'Очистить данные приватного режима вручную': 'Borrar los datos de la sesión privada',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Contraseñas de este dispositivo. Mostrar el usuario y la contraseña o eliminar cualquier entrada',
      'Один зашифрованный файл со всеми данными профиля': 'Un archivo cifrado con todos los datos del perfil',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Guardar automáticamente en la nube cada 15 minutos mientras Vio esté abierto',
      'Память выключена': 'La memoria está desactivada',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio no guardará nada hasta que la actives.',
      'Включить память': 'Activar memoria',
      'Сохранять текст страниц локально': 'Guardar el texto de las páginas localmente',
      'Панелей пока нет.': 'Aún no hay paneles.',
      'Свой CSS для сайтов': 'CSS personalizado para sitios web',
      'Производительность': 'Rendimiento',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automático: simplifica los efectos en equipos modestos; la velocidad máxima desactiva los efectos visuales pesados',
      'Авто': 'Automático',
      'Полные эффекты': 'Efectos completos',
      'Максимальная экономия': 'Ahorro máximo',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Elige un degradado suave o animado; la animación solo se activa si el modo de rendimiento lo permite',
      'Живая аврора': 'Aurora animada',
      'Живой океан': 'Océano animado',
      'Живой закат': 'Atardecer animado'
    },
    it: {
      'Режим чтения (Ctrl+Alt+R)': 'Modalità lettura (Ctrl+Alt+R)',
      'Web-панели': 'Pannelli Web',
      'Синхронизация': 'Sincronizzazione',
      'Память': 'Memoria',
      'Где показывать вкладки': 'Posizione delle schede',
      'Восстанавливать вкладки после запуска/сбоя': 'Ripristina le schede all’avvio o dopo un arresto anomalo',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Riapri le stesse schede dopo l’avvio di Vio o un arresto anomalo',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Spazio di archiviazione separato: cookie, cache e cronologia non vengono salvati. Alla chiusura dell’ultima scheda privata vengono eliminati tutti i dati della sessione.',
      'Очистить данные приватного режима вручную': 'Cancella i dati della sessione privata',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Password di questo dispositivo. Mostra nome utente e password oppure elimina una voce',
      'Один зашифрованный файл со всеми данными профиля': 'Un unico file crittografato con tutti i dati del profilo',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Salva automaticamente nel cloud ogni 15 minuti mentre Vio è aperto',
      'Память выключена': 'Memoria disattivata',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio non salverà nulla finché non la attivi.',
      'Включить память': 'Attiva memoria',
      'Сохранять текст страниц локально': 'Salva localmente il testo delle pagine',
      'Панелей пока нет.': 'Nessun pannello per ora.',
      'Свой CSS для сайтов': 'CSS personalizzato per i siti',
      'Производительность': 'Prestazioni',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automatico: semplifica gli effetti sui PC meno potenti; la massima velocità disattiva gli effetti visivi più pesanti',
      'Авто': 'Automatico',
      'Полные эффекты': 'Effetti completi',
      'Максимальная экономия': 'Risparmio massimo',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Scegli un gradiente sobrio o animato; l’animazione si attiva solo se la modalità prestazioni lo consente',
      'Живая аврора': 'Aurora animata',
      'Живой океан': 'Oceano animato',
      'Живой закат': 'Tramonto animato'
    },
    pt: {
      'Режим чтения (Ctrl+Alt+R)': 'Modo de leitura (Ctrl+Alt+R)',
      'Web-панели': 'Painéis Web',
      'Синхронизация': 'Sincronização',
      'Память': 'Memória',
      'Где показывать вкладки': 'Posição dos separadores',
      'Восстанавливать вкладки после запуска/сбоя': 'Restaurar separadores ao iniciar ou após uma falha',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Reabrir os mesmos separadores após iniciar o Vio ou após uma falha',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Armazenamento separado: os cookies, a cache e o histórico não são guardados. Ao fechar o último separador privado, todos os dados da sessão são eliminados.',
      'Очистить данные приватного режима вручную': 'Limpar os dados da sessão privada',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Palavras-passe deste dispositivo. Mostrar o utilizador e a palavra-passe ou eliminar qualquer registo',
      'Один зашифрованный файл со всеми данными профиля': 'Um ficheiro encriptado com todos os dados do perfil',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Guardar automaticamente na nuvem a cada 15 minutos enquanto o Vio estiver aberto',
      'Память выключена': 'Memória desativada',
      'Пока вы не включите — Vio не сохраняет ничего.': 'O Vio não guarda nada até ativar esta opção.',
      'Включить память': 'Ativar memória',
      'Сохранять текст страниц локально': 'Guardar o texto das páginas localmente',
      'Панелей пока нет.': 'Ainda não existem painéis.',
      'Свой CSS для сайтов': 'CSS personalizado para sites',
      'Производительность': 'Desempenho',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automático: simplifica os efeitos em computadores modestos; a velocidade máxima desativa efeitos visuais pesados',
      'Авто': 'Automático',
      'Полные эффекты': 'Efeitos completos',
      'Максимальная экономия': 'Economia máxima',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Escolha um gradiente suave ou animado; a animação só é ativada se o modo de desempenho permitir',
      'Живая аврора': 'Aurora animada',
      'Живой океан': 'Oceano animado',
      'Живой закат': 'Pôr do sol animado'
    },
    pl: {
      'Режим чтения (Ctrl+Alt+R)': 'Tryb czytania (Ctrl+Alt+R)',
      'Web-панели': 'Panele internetowe',
      'Синхронизация': 'Synchronizacja',
      'Память': 'Pamięć',
      'Где показывать вкладки': 'Położenie kart',
      'Восстанавливать вкладки после запуска/сбоя': 'Przywracaj karty po uruchomieniu lub awarii',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Po uruchomieniu Vio lub awarii otwórz te same karty co wcześniej',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Oddzielny magazyn: pliki cookie, pamięć podręczna i historia nie są zapisywane. Zamknięcie ostatniej karty prywatnej usuwa wszystkie dane sesji.',
      'Очистить данные приватного режима вручную': 'Wyczyść dane sesji prywatnej',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Hasła zapisane na tym urządzeniu. Pokaż login i hasło lub usuń dowolny wpis',
      'Один зашифрованный файл со всеми данными профиля': 'Jeden zaszyfrowany plik ze wszystkimi danymi profilu',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Automatycznie zapisuj w chmurze co 15 minut, gdy Vio jest otwarty',
      'Память выключена': 'Pamięć jest wyłączona',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio niczego nie zapisuje, dopóki nie włączysz tej funkcji.',
      'Включить память': 'Włącz pamięć',
      'Сохранять текст страниц локально': 'Zapisuj tekst stron lokalnie',
      'Панелей пока нет.': 'Nie ma jeszcze paneli.',
      'Свой CSS для сайтов': 'Własny CSS dla stron',
      'Производительность': 'Wydajność',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automatycznie: upraszcza efekty na słabszych komputerach; maksymalna szybkość wyłącza wymagające efekty wizualne',
      'Авто': 'Automatycznie',
      'Полные эффекты': 'Pełne efekty',
      'Максимальная экономия': 'Maksymalna oszczędność',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Wybierz spokojny lub animowany gradient; animacja działa tylko w odpowiednim trybie wydajności',
      'Живая аврора': 'Animowana zorza',
      'Живой океан': 'Animowany ocean',
      'Живой закат': 'Animowany zachód słońca'
    },
    tr: {
      'Режим чтения (Ctrl+Alt+R)': 'Okuma modu (Ctrl+Alt+R)',
      'Web-панели': 'Web panelleri',
      'Синхронизация': 'Eşitleme',
      'Память': 'Bellek',
      'Где показывать вкладки': 'Sekme konumu',
      'Восстанавливать вкладки после запуска/сбоя': 'Başlangıçta veya çökmelerden sonra sekmeleri geri yükle',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Vio başlatıldığında veya çöktüğünde önceki sekmeleri yeniden aç',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Ayrı depolama alanı: çerezler, önbellek ve geçmiş kaydedilmez. Son gizli sekme kapatıldığında oturum verilerinin tümü silinir.',
      'Очистить данные приватного режима вручную': 'Gizli oturum verilerini şimdi temizle',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Bu cihazdaki parolalar. Kullanıcı adı ve parolayı gösterin veya bir kaydı silin',
      'Один зашифрованный файл со всеми данными профиля': 'Profil verilerinin tümünü içeren tek bir şifreli dosya',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Vio açıkken her 15 dakikada bir buluta otomatik kaydet',
      'Память выключена': 'Bellek kapalı',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Siz etkinleştirene kadar Vio hiçbir şey kaydetmez.',
      'Включить память': 'Belleği etkinleştir',
      'Сохранять текст страниц локально': 'Sayfa metinlerini yerel olarak kaydet',
      'Панелей пока нет.': 'Henüz panel yok.',
      'Свой CSS для сайтов': 'Web siteleri için özel CSS',
      'Производительность': 'Performans',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Otomatik: düşük donanımlı bilgisayarlarda efektleri basitleştirir; en yüksek hız ağır görsel efektleri kapatır',
      'Авто': 'Otomatik',
      'Полные эффекты': 'Tüm efektler',
      'Максимальная экономия': 'En yüksek tasarruf',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Sade veya hareketli bir gradyan seçin; animasyon yalnızca performans modu uygunsa çalışır',
      'Живая аврора': 'Hareketli kutup ışıkları',
      'Живой океан': 'Hareketli okyanus',
      'Живой закат': 'Hareketli gün batımı'
    },
    nl: {
      'Режим чтения (Ctrl+Alt+R)': 'Leesmodus (Ctrl+Alt+R)',
      'Web-панели': 'Webpanelen',
      'Синхронизация': 'Synchronisatie',
      'Память': 'Geheugen',
      'Где показывать вкладки': 'Tabbladpositie',
      'Восстанавливать вкладки после запуска/сбоя': 'Tabbladen herstellen na opstarten of een crash',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Open na het starten van Vio of een crash dezelfde tabbladen opnieuw',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Aparte opslag: cookies, cache en geschiedenis worden niet bewaard. Bij het sluiten van het laatste privétabblad worden alle sessiegegevens verwijderd.',
      'Очистить данные приватного режима вручную': 'Privésessiegegevens nu wissen',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Wachtwoorden op dit apparaat. Toon gebruikersnaam en wachtwoord of verwijder een item',
      'Один зашифрованный файл со всеми данными профиля': 'Eén versleuteld bestand met alle profielgegevens',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Sla automatisch elke 15 minuten op in de cloud zolang Vio geopend is',
      'Память выключена': 'Geheugen is uitgeschakeld',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio slaat niets op totdat je dit inschakelt.',
      'Включить память': 'Geheugen inschakelen',
      'Сохранять текст страниц локально': 'Paginatekst lokaal opslaan',
      'Панелей пока нет.': 'Er zijn nog geen panelen.',
      'Свой CSS для сайтов': 'Aangepaste CSS voor websites',
      'Производительность': 'Prestaties',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automatisch: vereenvoudigt effecten op minder krachtige pc’s; maximale snelheid schakelt zware effecten uit',
      'Авто': 'Automatisch',
      'Полные эффекты': 'Alle effecten',
      'Максимальная экономия': 'Maximale besparing',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Kies een rustige of bewegende kleurovergang; animatie werkt alleen als de prestatiemodus dit toelaat',
      'Живая аврора': 'Bewegend poollicht',
      'Живой океан': 'Bewegende oceaan',
      'Живой закат': 'Bewegende zonsondergang'
    },
    sv: {
      'Режим чтения (Ctrl+Alt+R)': 'Läsläge (Ctrl+Alt+R)',
      'Web-панели': 'Webbpaneler',
      'Синхронизация': 'Synkronisering',
      'Память': 'Minne',
      'Где показывать вкладки': 'Flikarnas placering',
      'Восстанавливать вкладки после запуска/сбоя': 'Återställ flikar efter start eller en krasch',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Öppna samma flikar igen när Vio startar eller efter en krasch',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Separat lagring: cookies, cache och historik sparas inte. Alla sessionsdata tas bort när den sista privata fliken stängs.',
      'Очистить данные приватного режима вручную': 'Rensa data för privat session nu',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Lösenord på den här enheten. Visa användarnamn och lösenord eller ta bort en post',
      'Один зашифрованный файл со всеми данными профиля': 'En krypterad fil med alla profildata',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Spara automatiskt i molnet var 15:e minut medan Vio är öppet',
      'Память выключена': 'Minne är avstängt',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio sparar ingenting förrän du aktiverar det.',
      'Включить память': 'Aktivera minne',
      'Сохранять текст страниц локально': 'Spara sidtext lokalt',
      'Панелей пока нет.': 'Det finns inga paneler ännu.',
      'Свой CSS для сайтов': 'Egen CSS för webbplatser',
      'Производительность': 'Prestanda',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automatiskt: förenklar effekter på enklare datorer; maximal hastighet stänger av tunga visuella effekter',
      'Авто': 'Automatiskt',
      'Полные эффекты': 'Alla effekter',
      'Максимальная экономия': 'Maximal besparing',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Välj en lugn eller animerad färgtoning; animering körs bara när prestandaläget tillåter det',
      'Живая аврора': 'Animerat norrsken',
      'Живой океан': 'Animerat hav',
      'Живой закат': 'Animerad solnedgång'
    },
    fi: {
      'Режим чтения (Ctrl+Alt+R)': 'Lukutila (Ctrl+Alt+R)',
      'Web-панели': 'Verkkopaneelit',
      'Синхронизация': 'Synkronointi',
      'Память': 'Muisti',
      'Где показывать вкладки': 'Välilehtien sijainti',
      'Восстанавливать вкладки после запуска/сбоя': 'Palauta välilehdet käynnistyksen tai kaatumisen jälkeen',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Avaa samat välilehdet uudelleen Vion käynnistyksen tai kaatumisen jälkeen',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Erillinen tallennustila: evästeitä, välimuistia ja historiaa ei tallenneta. Kaikki istuntotiedot poistetaan, kun viimeinen yksityinen välilehti suljetaan.',
      'Очистить данные приватного режима вручную': 'Tyhjennä yksityisen istunnon tiedot nyt',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Tämän laitteen salasanat. Näytä käyttäjätunnus ja salasana tai poista merkintä',
      'Один зашифрованный файл со всеми данными профиля': 'Yksi salattu tiedosto, joka sisältää kaikki profiilin tiedot',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Tallenna pilveen automaattisesti 15 minuutin välein, kun Vio on auki',
      'Память выключена': 'Muisti on pois käytöstä',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio ei tallenna mitään, ennen kuin otat tämän käyttöön.',
      'Включить память': 'Ota muisti käyttöön',
      'Сохранять текст страниц локально': 'Tallenna sivujen teksti paikallisesti',
      'Панелей пока нет.': 'Paneeleita ei vielä ole.',
      'Свой CSS для сайтов': 'Oma CSS verkkosivustoille',
      'Производительность': 'Suorituskyky',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automaattinen: keventää tehosteita vaatimattomilla tietokoneilla; nopein tila poistaa raskaat tehosteet käytöstä',
      'Авто': 'Automaattinen',
      'Полные эффекты': 'Kaikki tehosteet',
      'Максимальная экономия': 'Suurin säästö',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Valitse rauhallinen tai animoitu liukuväri; animaatio toimii vain suorituskykytilan salliessa',
      'Живая аврора': 'Animoitu revontuli',
      'Живой океан': 'Animoitu meri',
      'Живой закат': 'Animoitu auringonlasku'
    },
    cs: {
      'Режим чтения (Ctrl+Alt+R)': 'Režim čtení (Ctrl+Alt+R)',
      'Web-панели': 'Webové panely',
      'Синхронизация': 'Synchronizace',
      'Память': 'Paměť',
      'Где показывать вкладки': 'Umístění karet',
      'Восстанавливать вкладки после запуска/сбоя': 'Obnovit karty po spuštění nebo pádu',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Po spuštění Vio nebo pádu znovu otevřít stejné karty jako předtím',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Oddělené úložiště: cookies, mezipaměť a historie se neukládají. Po zavření poslední anonymní karty se odstraní všechna data relace.',
      'Очистить данные приватного режима вручную': 'Vymazat data anonymní relace',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Hesla v tomto zařízení. Zobrazte přihlašovací jméno a heslo nebo záznam smažte',
      'Один зашифрованный файл со всеми данными профиля': 'Jeden šifrovaný soubor se všemi údaji profilu',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Automaticky ukládat do cloudu každých 15 minut, dokud je Vio otevřené',
      'Память выключена': 'Paměť je vypnutá',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Dokud tuto funkci nezapnete, Vio nic neukládá.',
      'Включить память': 'Zapnout paměť',
      'Сохранять текст страниц локально': 'Ukládat text stránek místně',
      'Панелей пока нет.': 'Zatím tu nejsou žádné panely.',
      'Свой CSS для сайтов': 'Vlastní CSS pro weby',
      'Производительность': 'Výkon',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automaticky: zjednoduší efekty na slabších počítačích; maximální rychlost vypne náročné vizuální efekty',
      'Авто': 'Automaticky',
      'Полные эффекты': 'Plné efekty',
      'Максимальная экономия': 'Maximální úspora',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Vyberte klidný nebo animovaný přechod; animace se spustí pouze při vhodném režimu výkonu',
      'Живая аврора': 'Animovaná polární záře',
      'Живой океан': 'Animovaný oceán',
      'Живой закат': 'Animovaný západ slunce'
    },
    ro: {
      'Режим чтения (Ctrl+Alt+R)': 'Mod de citire (Ctrl+Alt+R)',
      'Web-панели': 'Panouri web',
      'Синхронизация': 'Sincronizare',
      'Память': 'Memorie',
      'Где показывать вкладки': 'Poziția filelor',
      'Восстанавливать вкладки после запуска/сбоя': 'Restabilește filele după pornire sau blocare',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Redeschide aceleași file după pornirea Vio sau după o blocare',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Stocare separată: cookie-urile, memoria cache și istoricul nu sunt salvate. La închiderea ultimei file private, toate datele sesiunii sunt șterse.',
      'Очистить данные приватного режима вручную': 'Șterge datele sesiunii private',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Parolele acestui dispozitiv. Afișează numele de utilizator și parola sau șterge o înregistrare',
      'Один зашифрованный файл со всеми данными профиля': 'Un singur fișier criptat cu toate datele profilului',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Salvează automat în cloud la fiecare 15 minute cât timp Vio este deschis',
      'Память выключена': 'Memoria este dezactivată',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio nu salvează nimic până când nu activezi această opțiune.',
      'Включить память': 'Activează memoria',
      'Сохранять текст страниц локально': 'Salvează local textul paginilor',
      'Панелей пока нет.': 'Nu există încă panouri.',
      'Свой CSS для сайтов': 'CSS personalizat pentru site-uri',
      'Производительность': 'Performanță',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Automat: simplifică efectele pe calculatoarele mai puțin performante; viteza maximă dezactivează efectele vizuale solicitante',
      'Авто': 'Automat',
      'Полные эффекты': 'Efecte complete',
      'Максимальная экономия': 'Economie maximă',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Alege un gradient discret sau animat; animația pornește numai dacă modul de performanță permite',
      'Живая аврора': 'Auroră animată',
      'Живой океан': 'Ocean animat',
      'Живой закат': 'Apus animat'
    },
    el: {
      'Режим чтения (Ctrl+Alt+R)': 'Λειτουργία ανάγνωσης (Ctrl+Alt+R)',
      'Web-панели': 'Πάνελ ιστού',
      'Синхронизация': 'Συγχρονισμός',
      'Память': 'Μνήμη',
      'Где показывать вкладки': 'Θέση καρτελών',
      'Восстанавливать вкладки после запуска/сбоя': 'Επαναφορά καρτελών κατά την εκκίνηση ή μετά από κατάρρευση',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Άνοιγμα των ίδιων καρτελών μετά την εκκίνηση ή την κατάρρευση του Vio',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Ξεχωριστός χώρος αποθήκευσης: τα cookie, η cache και το ιστορικό δεν αποθηκεύονται. Με το κλείσιμο της τελευταίας ιδιωτικής καρτέλας διαγράφονται όλα τα δεδομένα της συνεδρίας.',
      'Очистить данные приватного режима вручную': 'Εκκαθάριση δεδομένων ιδιωτικής συνεδρίας',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Κωδικοί πρόσβασης αυτής της συσκευής. Εμφάνιση ονόματος χρήστη και κωδικού ή διαγραφή εγγραφής',
      'Один зашифрованный файл со всеми данными профиля': 'Ένα κρυπτογραφημένο αρχείο με όλα τα δεδομένα προφίλ',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Αυτόματη αποθήκευση στο cloud κάθε 15 λεπτά όσο το Vio είναι ανοιχτό',
      'Память выключена': 'Η μνήμη είναι απενεργοποιημένη',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Το Vio δεν αποθηκεύει τίποτα μέχρι να την ενεργοποιήσετε.',
      'Включить память': 'Ενεργοποίηση μνήμης',
      'Сохранять текст страниц локально': 'Τοπική αποθήκευση κειμένου σελίδων',
      'Панелей пока нет.': 'Δεν υπάρχουν ακόμη πάνελ.',
      'Свой CSS для сайтов': 'Προσαρμοσμένο CSS για ιστότοπους',
      'Производительность': 'Απόδοση',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Αυτόματα: απλοποιεί τα εφέ σε αδύναμους υπολογιστές· η μέγιστη ταχύτητα απενεργοποιεί τα απαιτητικά οπτικά εφέ',
      'Авто': 'Αυτόματα',
      'Полные эффекты': 'Πλήρη εφέ',
      'Максимальная экономия': 'Μέγιστη εξοικονόμηση',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Επιλέξτε ήρεμη ή κινούμενη διαβάθμιση· η κίνηση ενεργοποιείται μόνο όταν το επιτρέπει η λειτουργία απόδοσης',
      'Живая аврора': 'Κινούμενο σέλας',
      'Живой океан': 'Κινούμενος ωκεανός',
      'Живой закат': 'Κινούμενο ηλιοβασίλεμα'
    },
    be: {
      'Режим чтения (Ctrl+Alt+R)': 'Рэжым чытання (Ctrl+Alt+R)',
      'Web-панели': 'Вэб-панэлі',
      'Синхронизация': 'Сінхранізацыя',
      'Память': 'Памяць',
      'Где показывать вкладки': 'Дзе паказваць укладкі',
      'Восстанавливать вкладки после запуска/сбоя': 'Аднаўляць укладкі пасля запуску/збою',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Пасля запуску Vio або раптоўнага збою адкрыць тыя ж укладкі, што былі да закрыцця',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Асобнае сховішча: файлы cookie, кэш і гісторыя не захоўваюцца. Пры закрыцці апошняй прыватнай укладкі выдаляюцца ўсе даныя сеанса.',
      'Очистить данные приватного режима вручную': 'Ачысціць даныя прыватнага рэжыму ўручную',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Паролі на гэтай прыладзе. Лагін і пароль можна паказаць, любы запіс — выдаліць',
      'Один зашифрованный файл со всеми данными профиля': 'Адзін зашыфраваны файл з усімі данымі профілю',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Аўтаматычна захоўваць у воблака кожныя 15 хвілін, пакуль Vio адкрыты',
      'Память выключена': 'Памяць выключана',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Пакуль вы не ўключыце гэту функцыю, Vio нічога не захоўвае.',
      'Включить память': 'Уключыць памяць',
      'Сохранять текст страниц локально': 'Захоўваць тэкст старонак лакальна',
      'Панелей пока нет.': 'Панэляў пакуль няма.',
      'Свой CSS для сайтов': 'Свой CSS для сайтаў',
      'Производительность': 'Прадукцыйнасць',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Аўта — спрашчае эфекты на слабых ПК; максімальная хуткасць адключае рэсурсаёмістае афармленне',
      'Авто': 'Аўта',
      'Полные эффекты': 'Усе эфекты',
      'Максимальная экономия': 'Максімальная эканомія',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Абярыце спакойны або аніміраваны градыент; анімацыя працуе толькі ў адпаведным рэжыме прадукцыйнасці',
      'Живая аврора': 'Жывая аўрора',
      'Живой океан': 'Жывы акіян',
      'Живой закат': 'Жывы захад сонца'
    },
    kk: {
      'Режим чтения (Ctrl+Alt+R)': 'Оқу режимі (Ctrl+Alt+R)',
      'Web-панели': 'Веб-панельдер',
      'Синхронизация': 'Синхрондау',
      'Память': 'Жад',
      'Где показывать вкладки': 'Қойындылардың орны',
      'Восстанавливать вкладки после запуска/сбоя': 'Іске қосылғанда немесе ақаудан кейін қойындыларды қалпына келтіру',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Vio іске қосылғанда немесе ақаудан кейін бұрынғы қойындыларды қайта ашу',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'Бөлек сақтау орны: cookie, кэш және тарих сақталмайды. Соңғы жекелік қойынды жабылғанда сеанстың барлық деректері жойылады.',
      'Очистить данные приватного режима вручную': 'Жекелік режим деректерін қолмен тазарту',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'Осы құрылғыдағы құпиясөздер. Логин мен құпиясөзді көрсетуге немесе жазбаны жоюға болады',
      'Один зашифрованный файл со всеми данными профиля': 'Профильдің барлық деректері бар бір шифрланған файл',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Vio ашық кезде әр 15 минут сайын бұлтқа автоматты сақтау',
      'Память выключена': 'Жад өшірулі',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Қоспайынша, Vio ештеңе сақтамайды.',
      'Включить память': 'Жадты қосу',
      'Сохранять текст страниц локально': 'Бет мәтінін құрылғыда сақтау',
      'Панелей пока нет.': 'Әзірше панельдер жоқ.',
      'Свой CSS для сайтов': 'Сайттарға арналған CSS',
      'Производительность': 'Өнімділік',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'Авто — әлсіз компьютерлерде әсерлерді жеңілдетеді; ең жоғары жылдамдық ауыр көрініс әсерлерін өшіреді',
      'Авто': 'Авто',
      'Полные эффекты': 'Барлық әсерлер',
      'Максимальная экономия': 'Ең жоғары үнемдеу',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'Баяу немесе анимациялы градиентті таңдаңыз; анимация тек өнімділік режимі қолдағанда қосылады',
      'Живая аврора': 'Қозғалмалы шұғыла',
      'Живой океан': 'Қозғалмалы мұхит',
      'Живой закат': 'Қозғалмалы күн батысы'
    },
    ar: {
      'Режим чтения (Ctrl+Alt+R)': 'وضع القراءة (Ctrl+Alt+R)',
      'Web-панели': 'لوحات الويب',
      'Синхронизация': 'المزامنة',
      'Память': 'الذاكرة',
      'Где показывать вкладки': 'موضع علامات التبويب',
      'Восстанавливать вкладки после запуска/сбоя': 'استعادة علامات التبويب عند بدء التشغيل أو بعد التعطل',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'إعادة فتح علامات التبويب نفسها بعد بدء Vio أو حدوث عطل',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'مساحة تخزين منفصلة: لا تُحفظ ملفات تعريف الارتباط أو ذاكرة التخزين المؤقت أو السجل. تُحذف بيانات الجلسة عند إغلاق آخر علامة تبويب خاصة.',
      'Очистить данные приватного режима вручную': 'مسح بيانات الجلسة الخاصة الآن',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'كلمات مرور هذا الجهاز. اعرض اسم المستخدم وكلمة المرور أو احذف أي إدخال',
      'Один зашифрованный файл со всеми данными профиля': 'ملف واحد مشفّر يتضمن جميع بيانات الملف الشخصي',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'الحفظ تلقائيًا في السحابة كل 15 دقيقة أثناء تشغيل Vio',
      'Память выключена': 'الذاكرة متوقفة',
      'Пока вы не включите — Vio не сохраняет ничего.': 'لن يحفظ Vio أي شيء حتى تفعّل هذه الميزة.',
      'Включить память': 'تفعيل الذاكرة',
      'Сохранять текст страниц локально': 'حفظ نص الصفحات محليًا',
      'Панелей пока нет.': 'لا توجد لوحات حتى الآن.',
      'Свой CSS для сайтов': 'CSS مخصص للمواقع',
      'Производительность': 'الأداء',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'تلقائي: يبسط المؤثرات على الأجهزة الضعيفة؛ وتعطّل السرعة القصوى المؤثرات المرئية الثقيلة',
      'Авто': 'تلقائي',
      'Полные эффекты': 'المؤثرات كاملة',
      'Максимальная экономия': 'أقصى توفير',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'اختر تدرجًا هادئًا أو متحركًا؛ لا تعمل الحركة إلا عندما يسمح وضع الأداء بذلك',
      'Живая аврора': 'شفق قطبي متحرك',
      'Живой океан': 'محيط متحرك',
      'Живой закат': 'غروب متحرك'
    },
    he: {
      'Режим чтения (Ctrl+Alt+R)': 'מצב קריאה (Ctrl+Alt+R)',
      'Web-панели': 'לוחות Web',
      'Синхронизация': 'סנכרון',
      'Память': 'זיכרון',
      'Где показывать вкладки': 'מיקום הכרטיסיות',
      'Восстанавливать вкладки после запуска/сбоя': 'שחזור כרטיסיות לאחר הפעלה או קריסה',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'פתיחת אותן כרטיסיות לאחר הפעלת Vio או קריסה',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': 'אחסון נפרד: קובצי Cookie, מטמון והיסטוריה אינם נשמרים. סגירת הכרטיסייה הפרטית האחרונה מוחקת את כל נתוני ההפעלה.',
      'Очистить данные приватного режима вручную': 'ניקוי נתוני הגלישה הפרטית עכשיו',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'סיסמאות במכשיר זה. הצגת שם המשתמש והסיסמה או מחיקת רשומה',
      'Один зашифрованный файл со всеми данными профиля': 'קובץ מוצפן אחד עם כל נתוני הפרופיל',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'שמירה אוטומטית בענן כל 15 דקות כל עוד Vio פתוח',
      'Память выключена': 'הזיכרון כבוי',
      'Пока вы не включите — Vio не сохраняет ничего.': 'Vio לא ישמור דבר עד להפעלת האפשרות.',
      'Включить память': 'הפעלת זיכרון',
      'Сохранять текст страниц локально': 'שמירת טקסט הדפים באופן מקומי',
      'Панелей пока нет.': 'אין עדיין לוחות.',
      'Свой CSS для сайтов': 'CSS מותאם אישית לאתרים',
      'Производительность': 'ביצועים',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': 'אוטומטי: מפשט אפקטים במחשבים חלשים; מהירות מרבית מכבה אפקטים חזותיים כבדים',
      'Авто': 'אוטומטי',
      'Полные эффекты': 'כל האפקטים',
      'Максимальная экономия': 'חיסכון מרבי',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': 'בחרו מעבר צבעים רגוע או מונפש; האנימציה פועלת רק כשהגדרת הביצועים מאפשרת זאת',
      'Живая аврора': 'זוהר צפוני מונפש',
      'Живой океан': 'אוקיינוס מונפש',
      'Живой закат': 'שקיעה מונפשת'
    },
    zh: {
      'Режим чтения (Ctrl+Alt+R)': '阅读模式 (Ctrl+Alt+R)',
      'Web-панели': '网页面板',
      'Синхронизация': '同步',
      'Память': '记忆',
      'Где показывать вкладки': '标签页位置',
      'Восстанавливать вкладки после запуска/сбоя': '启动或崩溃后恢复标签页',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Vio 启动或崩溃后重新打开之前的标签页',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': '独立存储：不保存 Cookie、缓存和历史记录。关闭最后一个隐私标签页时会删除本次会话的所有数据。',
      'Очистить данные приватного режима вручную': '立即清除隐私会话数据',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': '此设备上的密码。可显示用户名和密码，或删除任意条目',
      'Один зашифрованный файл со всеми данными профиля': '包含所有个人资料数据的单个加密文件',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Vio 运行期间每 15 分钟自动保存到云端',
      'Память выключена': '记忆已关闭',
      'Пока вы не включите — Vio не сохраняет ничего.': '启用此功能前，Vio 不会保存任何内容。',
      'Включить память': '启用记忆',
      'Сохранять текст страниц локально': '在本地保存网页文本',
      'Панелей пока нет.': '目前没有面板。',
      'Свой CSS для сайтов': '网站自定义 CSS',
      'Производительность': '性能',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': '自动：在性能较弱的电脑上简化效果；极速模式会关闭耗资源的视觉效果',
      'Авто': '自动',
      'Полные эффекты': '完整效果',
      'Максимальная экономия': '最大节能',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': '选择静态或动态渐变；仅在性能模式允许时播放动画',
      'Живая аврора': '动态极光',
      'Живой океан': '动态海洋',
      'Живой закат': '动态日落'
    },
    ja: {
      'Режим чтения (Ctrl+Alt+R)': 'リーダーモード (Ctrl+Alt+R)',
      'Web-панели': 'Web パネル',
      'Синхронизация': '同期',
      'Память': 'メモリ',
      'Где показывать вкладки': 'タブの位置',
      'Восстанавливать вкладки после запуска/сбоя': '起動時またはクラッシュ後にタブを復元',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Vio の起動後またはクラッシュ後に、以前のタブを再度開く',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': '独立した保存領域です。Cookie、キャッシュ、履歴は保存されません。最後のプライベートタブを閉じると、セッションデータはすべて削除されます。',
      'Очистить данные приватного режима вручную': 'プライベートセッションのデータを消去',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': 'このデバイスのパスワード。ユーザー名とパスワードの表示、または項目の削除ができます',
      'Один зашифрованный файл со всеми данными профиля': 'プロフィールデータをすべて含む暗号化ファイル',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Vio の起動中、15 分ごとにクラウドへ自動保存',
      'Память выключена': 'メモリはオフです',
      'Пока вы не включите — Vio не сохраняет ничего.': '有効にするまで、Vio は何も保存しません。',
      'Включить память': 'メモリを有効にする',
      'Сохранять текст страниц локально': 'ページのテキストをローカルに保存',
      'Панелей пока нет.': 'パネルはまだありません。',
      'Свой CSS для сайтов': 'サイト用カスタム CSS',
      'Производительность': 'パフォーマンス',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': '自動：低性能 PC では効果を簡略化し、最高速度では負荷の高い視覚効果を無効にします',
      'Авто': '自動',
      'Полные эффекты': 'すべての効果',
      'Максимальная экономия': '最大限に節約',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': '静かなグラデーションまたはアニメーションを選択できます。アニメーションは性能モードが許可する場合のみ動作します',
      'Живая аврора': '動くオーロラ',
      'Живой океан': '動く海',
      'Живой закат': '動く夕焼け'
    },
    ko: {
      'Режим чтения (Ctrl+Alt+R)': '읽기 모드 (Ctrl+Alt+R)',
      'Web-панели': '웹 패널',
      'Синхронизация': '동기화',
      'Память': '메모리',
      'Где показывать вкладки': '탭 위치',
      'Восстанавливать вкладки после запуска/сбоя': '시작 또는 충돌 후 탭 복원',
      'После запуска Vio или внезапного сбоя открыть те же вкладки, что были до закрытия': 'Vio를 시작하거나 충돌한 후 이전 탭 다시 열기',
      'Отдельный контур хранения: куки, кэш и история не сохраняются. При закрытии последней приватной вкладки все данные этой сессии удаляются.': '별도 저장 공간입니다. 쿠키, 캐시, 방문 기록은 저장되지 않습니다. 마지막 비공개 탭을 닫으면 세션 데이터가 모두 삭제됩니다.',
      'Очистить данные приватного режима вручную': '비공개 세션 데이터 지금 지우기',
      'Пароли этого устройства. Логин и пароль можно показать, любую запись — удалить': '이 기기의 비밀번호입니다. 사용자 이름과 비밀번호를 보거나 항목을 삭제할 수 있습니다',
      'Один зашифрованный файл со всеми данными профиля': '모든 프로필 데이터가 담긴 암호화 파일 하나',
      'Сохранять в облако автоматически раз в 15 минут, пока Vio открыт': 'Vio가 열려 있는 동안 15분마다 클라우드에 자동 저장',
      'Память выключена': '메모리가 꺼져 있습니다',
      'Пока вы не включите — Vio не сохраняет ничего.': '이 기능을 켜기 전까지 Vio는 아무것도 저장하지 않습니다.',
      'Включить память': '메모리 켜기',
      'Сохранять текст страниц локально': '페이지 텍스트를 로컬에 저장',
      'Панелей пока нет.': '아직 패널이 없습니다.',
      'Свой CSS для сайтов': '웹사이트 사용자 지정 CSS',
      'Производительность': '성능',
      'Авто — упрощает эффекты на слабом ПК; максимум скорости отключает тяжёлые украшения': '자동: 저사양 PC에서는 효과를 단순화하고, 최고 속도에서는 무거운 시각 효과를 끕니다',
      'Авто': '자동',
      'Полные эффекты': '모든 효과',
      'Максимальная экономия': '최대 절약',
      'Выберите спокойный или живой градиент; анимация включается только в подходящем режиме производительности': '차분하거나 움직이는 그라데이션을 선택하세요. 성능 모드가 허용할 때만 애니메이션이 실행됩니다',
      'Живая аврора': '움직이는 오로라',
      'Живой океан': '움직이는 바다',
      'Живой закат': '움직이는 노을'
    }
  }
  var SETTINGS_IMPORT_DICT = {
    uk: {
      'Импорт и пароли': 'Імпорт і паролі',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Перенесення власних даних з іншого браузера. Читаються лише файли на вашому диску: закладки й історія імпортуються безпосередньо з файлів браузера, паролі — через DPAPI Windows. Жодні дані не передаються в мережу.',
      'Перенос из Chrome, Firefox и других': 'Перенесення з Chrome, Firefox та інших браузерів',
      'Источник': 'Джерело',
      'Браузеры и профили, найденные на этом компьютере': 'Браузери й профілі, знайдені на цьому комп’ютері',
      'Что перенести': 'Що перенести',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Позначте потрібне. Повторний імпорт не створює дублікатів',
      'Запустить': 'Запустити',
      'Импорт идёт локально и занимает несколько секунд': 'Імпорт виконується локально й триває кілька секунд',
      'Импортировать': 'Імпортувати',
      'Пароли Vio': 'Паролі Vio',
      'Сохранять пароли': 'Зберігати паролі',
      'Где хранятся': 'Де зберігаються',
      'Сохранённые пароли': 'Збережені паролі',
      'В хранилище': 'У сховищі'
    },
    hi: {
      'Импорт и пароли': 'आयात और पासवर्ड',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'दूसरे ब्राउज़र से अपना डेटा लाएँ। केवल आपके कंप्यूटर की फ़ाइलें पढ़ी जाती हैं: बुकमार्क और इतिहास सीधे ब्राउज़र फ़ाइलों से, पासवर्ड Windows DPAPI से। कोई डेटा नेटवर्क पर नहीं भेजा जाता।',
      'Перенос из Chrome, Firefox и других': 'Chrome, Firefox और अन्य ब्राउज़र से आयात',
      'Источник': 'स्रोत',
      'Браузеры и профили, найденные на этом компьютере': 'इस कंप्यूटर पर मिले ब्राउज़र और प्रोफ़ाइल',
      'Что перенести': 'क्या आयात करना है',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'चुनें कि क्या आयात करना है। दोबारा आयात करने पर डुप्लिकेट नहीं बनते',
      'Запустить': 'शुरू करें',
      'Импорт идёт локально и занимает несколько секунд': 'आयात डिवाइस पर ही होता है और कुछ सेकंड लेता है',
      'Импортировать': 'आयात करें',
      'Пароли Vio': 'Vio पासवर्ड',
      'Сохранять пароли': 'पासवर्ड सहेजें',
      'Где хранятся': 'कहाँ सहेजे जाते हैं',
      'Сохранённые пароли': 'सहेजे गए पासवर्ड',
      'В хранилище': 'पासवर्ड वॉल्ट'
    },
    en: {
      'Импорт и пароли': 'Import and passwords',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Move your data from another browser. Vio reads only files on your device: bookmarks and history come directly from browser files, and passwords are imported through Windows DPAPI. Nothing is sent over the network.',
      'Перенос из Chrome, Firefox и других': 'Import from Chrome, Firefox and other browsers',
      'Источник': 'Source',
      'Браузеры и профили, найденные на этом компьютере': 'Browsers and profiles found on this computer',
      'Что перенести': 'Choose what to import',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Select what you need. Re-importing does not create duplicates',
      'Запустить': 'Start',
      'Импорт идёт локально и занимает несколько секунд': 'Import runs locally and takes a few seconds',
      'Импортировать': 'Import',
      'Пароли Vio': 'Vio passwords',
      'Сохранять пароли': 'Save passwords',
      'Где хранятся': 'Storage location',
      'Сохранённые пароли': 'Saved passwords',
      'В хранилище': 'In the vault'
    },
    de: {
      'Импорт и пароли': 'Import und Passwörter',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Daten aus einem anderen Browser übernehmen. Vio liest nur Dateien auf diesem Gerät: Lesezeichen und Verlauf direkt aus den Browserdateien, Passwörter über Windows DPAPI. Es werden keine Daten über das Netzwerk übertragen.',
      'Перенос из Chrome, Firefox и других': 'Import aus Chrome, Firefox und anderen Browsern',
      'Источник': 'Quelle',
      'Браузеры и профили, найденные на этом компьютере': 'Auf diesem Computer gefundene Browser und Profile',
      'Что перенести': 'Zu importierende Daten',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Gewünschte Daten auswählen. Ein erneuter Import erzeugt keine Duplikate',
      'Запустить': 'Starten',
      'Импорт идёт локально и занимает несколько секунд': 'Der Import erfolgt lokal und dauert nur wenige Sekunden',
      'Импортировать': 'Importieren',
      'Пароли Vio': 'Vio-Passwörter',
      'Сохранять пароли': 'Passwörter speichern',
      'Где хранятся': 'Speicherort',
      'Сохранённые пароли': 'Gespeicherte Passwörter',
      'В хранилище': 'Im Tresor'
    },
    fr: {
      'Импорт и пароли': 'Importation et mots de passe',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Transférez vos données depuis un autre navigateur. Vio lit uniquement les fichiers présents sur votre appareil : les favoris et l’historique proviennent directement des fichiers du navigateur, et les mots de passe sont importés via DPAPI de Windows. Aucune donnée n’est envoyée sur le réseau.',
      'Перенос из Chrome, Firefox и других': 'Importer depuis Chrome, Firefox et d’autres navigateurs',
      'Источник': 'Source',
      'Браузеры и профили, найденные на этом компьютере': 'Navigateurs et profils détectés sur cet ordinateur',
      'Что перенести': 'Éléments à importer',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Sélectionnez les éléments souhaités. Un nouvel import ne crée pas de doublons',
      'Запустить': 'Démarrer',
      'Импорт идёт локально и занимает несколько секунд': 'L’importation se fait localement et ne prend que quelques secondes',
      'Импортировать': 'Importer',
      'Пароли Vio': 'Mots de passe Vio',
      'Сохранять пароли': 'Enregistrer les mots de passe',
      'Где хранятся': 'Emplacement de stockage',
      'Сохранённые пароли': 'Mots de passe enregistrés',
      'В хранилище': 'Dans le coffre-fort'
    },
    es: {
      'Импорт и пароли': 'Importación y contraseñas',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Transfiere tus datos desde otro navegador. Vio solo lee archivos de este equipo: los marcadores y el historial se obtienen directamente de los archivos del navegador, y las contraseñas se importan mediante DPAPI de Windows. No se envía nada por la red.',
      'Перенос из Chrome, Firefox и других': 'Importar desde Chrome, Firefox y otros navegadores',
      'Источник': 'Origen',
      'Браузеры и профили, найденные на этом компьютере': 'Navegadores y perfiles encontrados en este equipo',
      'Что перенести': 'Qué importar',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Selecciona lo que quieras. Volver a importar no crea duplicados',
      'Запустить': 'Iniciar',
      'Импорт идёт локально и занимает несколько секунд': 'La importación se realiza localmente y tarda unos segundos',
      'Импортировать': 'Importar',
      'Пароли Vio': 'Contraseñas de Vio',
      'Сохранять пароли': 'Guardar contraseñas',
      'Где хранятся': 'Ubicación de almacenamiento',
      'Сохранённые пароли': 'Contraseñas guardadas',
      'В хранилище': 'En la bóveda'
    },
    it: {
      'Импорт и пароли': 'Importazione e password',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Trasferisci i tuoi dati da un altro browser. Vio legge solo i file presenti sul dispositivo: preferiti e cronologia provengono direttamente dai file del browser, mentre le password vengono importate tramite DPAPI di Windows. Nessun dato viene inviato in rete.',
      'Перенос из Chrome, Firefox и других': 'Importa da Chrome, Firefox e altri browser',
      'Источник': 'Origine',
      'Браузеры и профили, найденные на этом компьютере': 'Browser e profili trovati su questo computer',
      'Что перенести': 'Elementi da importare',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Seleziona ciò che vuoi importare. Le importazioni successive non creano duplicati',
      'Запустить': 'Avvia',
      'Импорт идёт локально и занимает несколько секунд': 'L’importazione avviene in locale e richiede pochi secondi',
      'Импортировать': 'Importa',
      'Пароли Vio': 'Password di Vio',
      'Сохранять пароли': 'Salva password',
      'Где хранятся': 'Posizione di archiviazione',
      'Сохранённые пароли': 'Password salvate',
      'В хранилище': 'Nel deposito'
    },
    pt: {
      'Импорт и пароли': 'Importação e palavras-passe',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Transfira os seus dados de outro navegador. O Vio lê apenas ficheiros neste dispositivo: os favoritos e o histórico são obtidos diretamente dos ficheiros do navegador, e as palavras-passe são importadas através do DPAPI do Windows. Nada é enviado pela rede.',
      'Перенос из Chrome, Firefox и других': 'Importar do Chrome, Firefox e outros navegadores',
      'Источник': 'Origem',
      'Браузеры и профили, найденные на этом компьютере': 'Navegadores e perfis encontrados neste computador',
      'Что перенести': 'O que importar',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Selecione o que pretende. Uma nova importação não cria duplicados',
      'Запустить': 'Iniciar',
      'Импорт идёт локально и занимает несколько секунд': 'A importação é feita localmente e demora alguns segundos',
      'Импортировать': 'Importar',
      'Пароли Vio': 'Palavras-passe do Vio',
      'Сохранять пароли': 'Guardar palavras-passe',
      'Где хранятся': 'Local de armazenamento',
      'Сохранённые пароли': 'Palavras-passe guardadas',
      'В хранилище': 'No cofre'
    },
    pl: {
      'Импорт и пароли': 'Import i hasła',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Przenieś swoje dane z innej przeglądarki. Vio odczytuje wyłącznie pliki z tego urządzenia: zakładki i historię bezpośrednio z plików przeglądarki, a hasła przez Windows DPAPI. Żadne dane nie są wysyłane przez sieć.',
      'Перенос из Chrome, Firefox и других': 'Import z Chrome, Firefoksa i innych przeglądarek',
      'Источник': 'Źródło',
      'Браузеры и профили, найденные на этом компьютере': 'Przeglądarki i profile znalezione na tym komputerze',
      'Что перенести': 'Co zaimportować',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Wybierz potrzebne dane. Ponowny import nie tworzy duplikatów',
      'Запустить': 'Uruchom',
      'Импорт идёт локально и занимает несколько секунд': 'Import odbywa się lokalnie i trwa kilka sekund',
      'Импортировать': 'Importuj',
      'Пароли Vio': 'Hasła Vio',
      'Сохранять пароли': 'Zapisuj hasła',
      'Где хранятся': 'Miejsce przechowywania',
      'Сохранённые пароли': 'Zapisane hasła',
      'В хранилище': 'W sejfie'
    },
    tr: {
      'Импорт и пароли': 'İçe aktarma ve parolalar',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Verilerinizi başka bir tarayıcıdan aktarın. Vio yalnızca cihazınızdaki dosyaları okur: yer imleri ve geçmiş tarayıcı dosyalarından, parolalar Windows DPAPI üzerinden alınır. Ağ üzerinden hiçbir veri gönderilmez.',
      'Перенос из Chrome, Firefox и других': 'Chrome, Firefox ve diğer tarayıcılardan aktar',
      'Источник': 'Kaynak',
      'Браузеры и профили, найденные на этом компьютере': 'Bu bilgisayarda bulunan tarayıcılar ve profiller',
      'Что перенести': 'Aktarılacaklar',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'İstediğiniz verileri seçin. Yeniden içe aktarma kopya oluşturmaz',
      'Запустить': 'Başlat',
      'Импорт идёт локально и занимает несколько секунд': 'Aktarım yerel olarak yapılır ve birkaç saniye sürer',
      'Импортировать': 'İçe aktar',
      'Пароли Vio': 'Vio parolaları',
      'Сохранять пароли': 'Parolaları kaydet',
      'Где хранятся': 'Saklama konumu',
      'Сохранённые пароли': 'Kayıtlı parolalar',
      'В хранилище': 'Kasada'
    },
    nl: {
      'Импорт и пароли': 'Importeren en wachtwoorden',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Zet je gegevens over vanuit een andere browser. Vio leest alleen bestanden op dit apparaat: bladwijzers en geschiedenis rechtstreeks uit browserbestanden, wachtwoorden via Windows DPAPI. Er wordt niets via het netwerk verzonden.',
      'Перенос из Chrome, Firefox и других': 'Importeren uit Chrome, Firefox en andere browsers',
      'Источник': 'Bron',
      'Браузеры и профили, найденные на этом компьютере': 'Browsers en profielen die op deze computer zijn gevonden',
      'Что перенести': 'Wat wil je importeren?',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Selecteer wat je nodig hebt. Opnieuw importeren maakt geen duplicaten',
      'Запустить': 'Starten',
      'Импорт идёт локально и занимает несколько секунд': 'Het importeren gebeurt lokaal en duurt enkele seconden',
      'Импортировать': 'Importeren',
      'Пароли Vio': 'Vio-wachtwoorden',
      'Сохранять пароли': 'Wachtwoorden opslaan',
      'Где хранятся': 'Opslaglocatie',
      'Сохранённые пароли': 'Opgeslagen wachtwoorden',
      'В хранилище': 'In de kluis'
    },
    sv: {
      'Импорт и пароли': 'Import och lösenord',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Flytta dina data från en annan webbläsare. Vio läser bara filer på den här enheten: bokmärken och historik direkt från webbläsarens filer, lösenord via Windows DPAPI. Inga data skickas över nätverket.',
      'Перенос из Chrome, Firefox и других': 'Importera från Chrome, Firefox och andra webbläsare',
      'Источник': 'Källa',
      'Браузеры и профили, найденные на этом компьютере': 'Webbläsare och profiler som hittats på den här datorn',
      'Что перенести': 'Vad ska importeras?',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Välj det du vill ha. En ny import skapar inga dubbletter',
      'Запустить': 'Starta',
      'Импорт идёт локально и занимает несколько секунд': 'Importen sker lokalt och tar några sekunder',
      'Импортировать': 'Importera',
      'Пароли Vio': 'Vio-lösenord',
      'Сохранять пароли': 'Spara lösenord',
      'Где хранятся': 'Lagringsplats',
      'Сохранённые пароли': 'Sparade lösenord',
      'В хранилище': 'I lösenordsvalvet'
    },
    fi: {
      'Импорт и пароли': 'Tuonti ja salasanat',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Siirrä tietosi toisesta selaimesta. Vio lukee vain tällä laitteella olevia tiedostoja: kirjanmerkit ja historia suoraan selaimen tiedostoista, salasanat Windows DPAPI:n kautta. Mitään ei lähetetä verkkoon.',
      'Перенос из Chrome, Firefox и других': 'Tuo Chromesta, Firefoxista ja muista selaimista',
      'Источник': 'Lähde',
      'Браузеры и профили, найденные на этом компьютере': 'Tästä tietokoneesta löytyneet selaimet ja profiilit',
      'Что перенести': 'Valitse tuotavat tiedot',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Valitse haluamasi tiedot. Uudelleentuonti ei luo kaksoiskappaleita',
      'Запустить': 'Käynnistä',
      'Импорт идёт локально и занимает несколько секунд': 'Tuonti tehdään paikallisesti ja kestää muutaman sekunnin',
      'Импортировать': 'Tuo',
      'Пароли Vio': 'Vion salasanat',
      'Сохранять пароли': 'Tallenna salasanat',
      'Где хранятся': 'Tallennuspaikka',
      'Сохранённые пароли': 'Tallennetut salasanat',
      'В хранилище': 'Salasanavarastossa'
    },
    cs: {
      'Импорт и пароли': 'Import a hesla',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Přeneste svá data z jiného prohlížeče. Vio čte pouze soubory v tomto zařízení: záložky a historii přímo ze souborů prohlížeče, hesla přes Windows DPAPI. Do sítě se nic neposílá.',
      'Перенос из Chrome, Firefox и других': 'Import z Chromu, Firefoxu a dalších prohlížečů',
      'Источник': 'Zdroj',
      'Браузеры и профили, найденные на этом компьютере': 'Prohlížeče a profily nalezené v tomto počítači',
      'Что перенести': 'Co importovat',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Vyberte požadované položky. Opakovaný import nevytváří duplicity',
      'Запустить': 'Spustit',
      'Импорт идёт локально и занимает несколько секунд': 'Import probíhá místně a trvá několik sekund',
      'Импортировать': 'Importovat',
      'Пароли Vio': 'Hesla Vio',
      'Сохранять пароли': 'Ukládat hesla',
      'Где хранятся': 'Umístění úložiště',
      'Сохранённые пароли': 'Uložená hesla',
      'В хранилище': 'V trezoru'
    },
    ro: {
      'Импорт и пароли': 'Import și parole',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Transferă datele dintr-un alt browser. Vio citește doar fișierele de pe acest dispozitiv: marcajele și istoricul direct din fișierele browserului, iar parolele prin DPAPI Windows. Nu se trimite nimic prin rețea.',
      'Перенос из Chrome, Firefox и других': 'Importă din Chrome, Firefox și alte browsere',
      'Источник': 'Sursă',
      'Браузеры и профили, найденные на этом компьютере': 'Browsere și profiluri găsite pe acest computer',
      'Что перенести': 'Ce se importă',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Selectează ce dorești. Reimportarea nu creează duplicate',
      'Запустить': 'Pornește',
      'Импорт идёт локально и занимает несколько секунд': 'Importul se face local și durează câteva secunde',
      'Импортировать': 'Importă',
      'Пароли Vio': 'Parole Vio',
      'Сохранять пароли': 'Salvează parolele',
      'Где хранятся': 'Locația de stocare',
      'Сохранённые пароли': 'Parole salvate',
      'В хранилище': 'În seif'
    },
    el: {
      'Импорт и пароли': 'Εισαγωγή και κωδικοί πρόσβασης',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Μεταφέρετε τα δεδομένα σας από άλλο πρόγραμμα περιήγησης. Το Vio διαβάζει μόνο αρχεία σε αυτήν τη συσκευή: σελιδοδείκτες και ιστορικό απευθείας από τα αρχεία του προγράμματος περιήγησης, κωδικούς μέσω DPAPI των Windows. Δεν αποστέλλονται δεδομένα στο δίκτυο.',
      'Перенос из Chrome, Firefox и других': 'Εισαγωγή από Chrome, Firefox και άλλα προγράμματα περιήγησης',
      'Источник': 'Πηγή',
      'Браузеры и профили, найденные на этом компьютере': 'Προγράμματα περιήγησης και προφίλ που βρέθηκαν σε αυτόν τον υπολογιστή',
      'Что перенести': 'Τι να εισαχθεί',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Επιλέξτε όσα χρειάζεστε. Η επανάληψη εισαγωγής δεν δημιουργεί διπλότυπα',
      'Запустить': 'Έναρξη',
      'Импорт идёт локально и занимает несколько секунд': 'Η εισαγωγή γίνεται τοπικά και διαρκεί λίγα δευτερόλεπτα',
      'Импортировать': 'Εισαγωγή',
      'Пароли Vio': 'Κωδικοί πρόσβασης Vio',
      'Сохранять пароли': 'Αποθήκευση κωδικών πρόσβασης',
      'Где хранятся': 'Τοποθεσία αποθήκευσης',
      'Сохранённые пароли': 'Αποθηκευμένοι κωδικοί πρόσβασης',
      'В хранилище': 'Στο θησαυροφυλάκιο'
    },
    be: {
      'Импорт и пароли': 'Імпарт і паролі',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Перанясіце свае даныя з іншага браўзера. Vio чытае толькі файлы на гэтай прыладзе: закладкі і гісторыю — непасрэдна з файлаў браўзера, паролі — праз DPAPI Windows. Ніякія даныя не перадаюцца ў сетку.',
      'Перенос из Chrome, Firefox и других': 'Імпарт з Chrome, Firefox і іншых браўзераў',
      'Источник': 'Крыніца',
      'Браузеры и профили, найденные на этом компьютере': 'Браўзеры і профілі, знойдзеныя на гэтым камп’ютары',
      'Что перенести': 'Што перанесці',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Адзначце патрэбнае. Паўторны імпарт не стварае дублікатаў',
      'Запустить': 'Запусціць',
      'Импорт идёт локально и занимает несколько секунд': 'Імпарт адбываецца лакальна і займае некалькі секунд',
      'Импортировать': 'Імпартаваць',
      'Пароли Vio': 'Паролі Vio',
      'Сохранять пароли': 'Захоўваць паролі',
      'Где хранятся': 'Дзе захоўваюцца',
      'Сохранённые пароли': 'Захаваныя паролі',
      'В хранилище': 'У сховішчы'
    },
    kk: {
      'Импорт и пароли': 'Импорттау және құпиясөздер',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'Деректеріңізді басқа браузерден көшіріңіз. Vio тек осы құрылғыдағы файлдарды оқиды: бетбелгілер мен тарих браузер файлдарынан, құпиясөздер Windows DPAPI арқылы алынады. Желіге ештеңе жіберілмейді.',
      'Перенос из Chrome, Firefox и других': 'Chrome, Firefox және басқа браузерлерден импорттау',
      'Источник': 'Дереккөз',
      'Браузеры и профили, найденные на этом компьютере': 'Осы компьютерден табылған браузерлер мен профильдер',
      'Что перенести': 'Нені импорттау керек',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'Қажеттісін таңдаңыз. Қайта импорттау көшірме жасамайды',
      'Запустить': 'Бастау',
      'Импорт идёт локально и занимает несколько секунд': 'Импорт құрылғыда орындалады және бірнеше секунд алады',
      'Импортировать': 'Импорттау',
      'Пароли Vio': 'Vio құпиясөздері',
      'Сохранять пароли': 'Құпиясөздерді сақтау',
      'Где хранятся': 'Сақтау орны',
      'Сохранённые пароли': 'Сақталған құпиясөздер',
      'В хранилище': 'Қоймада'
    },
    ar: {
      'Импорт и пароли': 'استيراد وكلمات المرور',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'انقل بياناتك من متصفح آخر. يقرأ Vio الملفات الموجودة على جهازك فقط: تُستورد الإشارات المرجعية والسجل مباشرةً من ملفات المتصفح، وكلمات المرور عبر DPAPI في Windows. لا تُرسل أي بيانات عبر الشبكة.',
      'Перенос из Chrome, Firefox и других': 'استيراد من Chrome وFirefox ومتصفحات أخرى',
      'Источник': 'المصدر',
      'Браузеры и профили, найденные на этом компьютере': 'المتصفحات والملفات الشخصية الموجودة على هذا الجهاز',
      'Что перенести': 'ما الذي تريد استيراده؟',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'حدّد ما تريد. لا يؤدي الاستيراد مرة أخرى إلى إنشاء نسخ مكررة',
      'Запустить': 'بدء',
      'Импорт идёт локально и занимает несколько секунд': 'يتم الاستيراد محليًا ويستغرق بضع ثوانٍ',
      'Импортировать': 'استيراد',
      'Пароли Vio': 'كلمات مرور Vio',
      'Сохранять пароли': 'حفظ كلمات المرور',
      'Где хранятся': 'موقع التخزين',
      'Сохранённые пароли': 'كلمات المرور المحفوظة',
      'В хранилище': 'في الخزنة'
    },
    he: {
      'Импорт и пароли': 'ייבוא וסיסמאות',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': 'העברת נתונים מדפדפן אחר. Vio קורא רק קבצים שנמצאים במכשיר: סימניות והיסטוריה ישירות מקובצי הדפדפן, וסיסמאות באמצעות DPAPI של Windows. שום מידע לא נשלח לרשת.',
      'Перенос из Chrome, Firefox и других': 'ייבוא מ-Chrome, מ-Firefox ומדפדפנים אחרים',
      'Источник': 'מקור',
      'Браузеры и профили, найденные на этом компьютере': 'דפדפנים ופרופילים שנמצאו במחשב זה',
      'Что перенести': 'מה לייבא',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': 'בחרו את הפריטים הרצויים. ייבוא חוזר אינו יוצר כפילויות',
      'Запустить': 'התחלה',
      'Импорт идёт локально и занимает несколько секунд': 'הייבוא מתבצע מקומית ונמשך כמה שניות',
      'Импортировать': 'ייבוא',
      'Пароли Vio': 'סיסמאות Vio',
      'Сохранять пароли': 'שמירת סיסמאות',
      'Где хранятся': 'מיקום האחסון',
      'Сохранённые пароли': 'סיסמאות שמורות',
      'В хранилище': 'בכספת'
    },
    zh: {
      'Импорт и пароли': '导入与密码',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': '从其他浏览器迁移数据。Vio 只读取此设备上的文件：书签和历史记录直接来自浏览器文件，密码通过 Windows DPAPI 导入。不会向网络发送任何数据。',
      'Перенос из Chrome, Firefox и других': '从 Chrome、Firefox 等浏览器导入',
      'Источник': '来源',
      'Браузеры и профили, найденные на этом компьютере': '在此电脑上找到的浏览器和配置文件',
      'Что перенести': '选择要导入的内容',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': '勾选所需内容。再次导入不会创建重复项',
      'Запустить': '开始',
      'Импорт идёт локально и занимает несколько секунд': '导入在本地进行，只需几秒钟',
      'Импортировать': '导入',
      'Пароли Vio': 'Vio 密码',
      'Сохранять пароли': '保存密码',
      'Где хранятся': '存储位置',
      'Сохранённые пароли': '已保存的密码',
      'В хранилище': '密码库'
    },
    ja: {
      'Импорт и пароли': 'インポートとパスワード',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': '他のブラウザーからデータを移行します。Vio が読み取るのはこのデバイス上のファイルのみです。ブックマークと履歴はブラウザーのファイルから、パスワードは Windows DPAPI を通じて取り込みます。ネットワークへデータは送信されません。',
      'Перенос из Chrome, Firefox и других': 'Chrome、Firefox などからインポート',
      'Источник': 'インポート元',
      'Браузеры и профили, найденные на этом компьютере': 'このコンピューターで見つかったブラウザーとプロファイル',
      'Что перенести': 'インポートする項目',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': '必要な項目を選択してください。再インポートしても重複しません',
      'Запустить': '開始',
      'Импорт идёт локально и занимает несколько секунд': 'インポートはローカルで実行され、数秒で完了します',
      'Импортировать': 'インポート',
      'Пароли Vio': 'Vio のパスワード',
      'Сохранять пароли': 'パスワードを保存',
      'Где хранятся': '保存場所',
      'Сохранённые пароли': '保存したパスワード',
      'В хранилище': 'パスワード保管庫'
    },
    ko: {
      'Импорт и пароли': '가져오기 및 비밀번호',
      'Перенос своих данных из другого браузера. Читается только то, что лежит на вашем диске: закладки и история берутся напрямую из файлов браузера, пароли — через DPAPI Windows. В сеть не уходит ничего.': '다른 브라우저에서 데이터를 가져옵니다. Vio는 이 기기의 파일만 읽습니다. 북마크와 방문 기록은 브라우저 파일에서, 비밀번호는 Windows DPAPI를 통해 가져오며 네트워크로 전송되지 않습니다.',
      'Перенос из Chrome, Firefox и других': 'Chrome, Firefox 및 다른 브라우저에서 가져오기',
      'Источник': '가져올 위치',
      'Браузеры и профили, найденные на этом компьютере': '이 컴퓨터에서 찾은 브라우저 및 프로필',
      'Что перенести': '가져올 항목',
      'Отметьте нужное. Повторный импорт дубликаты не создаёт': '필요한 항목을 선택하세요. 다시 가져와도 중복 항목은 생성되지 않습니다',
      'Запустить': '시작',
      'Импорт идёт локально и занимает несколько секунд': '가져오기는 로컬에서 진행되며 몇 초 정도 걸립니다',
      'Импортировать': '가져오기',
      'Пароли Vio': 'Vio 비밀번호',
      'Сохранять пароли': '비밀번호 저장',
      'Где хранятся': '저장 위치',
      'Сохранённые пароли': '저장된 비밀번호',
      'В хранилище': '보관함'
    }
  }
  var SETTINGS_MORE_DICT = {
    uk: {
      'Куда синхронизировать': 'Куди синхронізувати',
      'Облако': 'Хмара',
      'Выключено': 'Вимкнено',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — без облікового запису (рекомендовано)',
      'Google Drive — требует настройки': 'Google Drive — потребує налаштування',
      'Dropbox — требует настройки': 'Dropbox — потребує налаштування',
      'Доступ': 'Доступ',
      'Новая панель': 'Нова панель',
      'Правила': 'Правила',
      'Назад': 'Назад',
      'Комбинации': 'Комбінації'
    },
    hi: {
      'Куда синхронизировать': 'कहाँ सिंक करें',
      'Облако': 'क्लाउड',
      'Выключено': 'बंद',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — बिना खाते के (अनुशंसित)',
      'Google Drive — требует настройки': 'Google Drive — सेटअप आवश्यक',
      'Dropbox — требует настройки': 'Dropbox — सेटअप आवश्यक',
      'Доступ': 'प्रवेश',
      'Новая панель': 'नया पैनल',
      'Правила': 'नियम',
      'Назад': 'पीछे',
      'Комбинации': 'शॉर्टकट संयोजन'
    },
    en: {
      'Куда синхронизировать': 'Sync destination',
      'Облако': 'Cloud',
      'Выключено': 'Off',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — no account required (recommended)',
      'Google Drive — требует настройки': 'Google Drive — setup required',
      'Dropbox — требует настройки': 'Dropbox — setup required',
      'Доступ': 'Credentials',
      'Новая панель': 'New panel',
      'Правила': 'Rules',
      'Назад': 'Back',
      'Комбинации': 'Key combinations'
    },
    de: {
      'Куда синхронизировать': 'Synchronisierungsziel',
      'Облако': 'Cloud',
      'Выключено': 'Aus',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — ohne Konto (empfohlen)',
      'Google Drive — требует настройки': 'Google Drive — Einrichtung erforderlich',
      'Dropbox — требует настройки': 'Dropbox — Einrichtung erforderlich',
      'Доступ': 'Zugangsdaten',
      'Новая панель': 'Neues Panel',
      'Правила': 'Regeln',
      'Назад': 'Zurück',
      'Комбинации': 'Tastenkombinationen'
    },
    fr: {
      'Куда синхронизировать': 'Destination de synchronisation',
      'Облако': 'Cloud',
      'Выключено': 'Désactivé',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — sans compte (recommandé)',
      'Google Drive — требует настройки': 'Google Drive — configuration requise',
      'Dropbox — требует настройки': 'Dropbox — configuration requise',
      'Доступ': 'Identifiants',
      'Новая панель': 'Nouveau panneau',
      'Правила': 'Règles',
      'Назад': 'Retour',
      'Комбинации': 'Combinaisons de touches'
    },
    es: {
      'Куда синхронизировать': 'Destino de sincronización',
      'Облако': 'Nube',
      'Выключено': 'Desactivado',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — sin cuenta (recomendado)',
      'Google Drive — требует настройки': 'Google Drive — requiere configuración',
      'Dropbox — требует настройки': 'Dropbox — requiere configuración',
      'Доступ': 'Credenciales',
      'Новая панель': 'Nuevo panel',
      'Правила': 'Reglas',
      'Назад': 'Atrás',
      'Комбинации': 'Combinaciones de teclas'
    },
    it: {
      'Куда синхронизировать': 'Destinazione della sincronizzazione',
      'Облако': 'Cloud',
      'Выключено': 'Disattivato',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — senza account (consigliato)',
      'Google Drive — требует настройки': 'Google Drive — richiede configurazione',
      'Dropbox — требует настройки': 'Dropbox — richiede configurazione',
      'Доступ': 'Credenziali',
      'Новая панель': 'Nuovo pannello',
      'Правила': 'Regole',
      'Назад': 'Indietro',
      'Комбинации': 'Combinazioni di tasti'
    },
    pt: {
      'Куда синхронизировать': 'Destino da sincronização',
      'Облако': 'Nuvem',
      'Выключено': 'Desativado',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — sem conta (recomendado)',
      'Google Drive — требует настройки': 'Google Drive — requer configuração',
      'Dropbox — требует настройки': 'Dropbox — requer configuração',
      'Доступ': 'Credenciais',
      'Новая панель': 'Novo painel',
      'Правила': 'Regras',
      'Назад': 'Voltar',
      'Комбинации': 'Combinações de teclas'
    },
    pl: {
      'Куда синхронизировать': 'Miejsce synchronizacji',
      'Облако': 'Chmura',
      'Выключено': 'Wyłączone',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — bez konta (zalecane)',
      'Google Drive — требует настройки': 'Google Drive — wymaga konfiguracji',
      'Dropbox — требует настройки': 'Dropbox — wymaga konfiguracji',
      'Доступ': 'Dane logowania',
      'Новая панель': 'Nowy panel',
      'Правила': 'Reguły',
      'Назад': 'Wstecz',
      'Комбинации': 'Skróty klawiszowe'
    },
    tr: {
      'Куда синхронизировать': 'Senkronizasyon hedefi',
      'Облако': 'Bulut',
      'Выключено': 'Kapalı',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — hesap gerekmez (önerilir)',
      'Google Drive — требует настройки': 'Google Drive — kurulum gerekli',
      'Dropbox — требует настройки': 'Dropbox — kurulum gerekli',
      'Доступ': 'Kimlik bilgileri',
      'Новая панель': 'Yeni panel',
      'Правила': 'Kurallar',
      'Назад': 'Geri',
      'Комбинации': 'Tuş kombinasyonları'
    },
    nl: {
      'Куда синхронизировать': 'Synchronisatiebestemming',
      'Облако': 'Cloud',
      'Выключено': 'Uit',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — geen account nodig (aanbevolen)',
      'Google Drive — требует настройки': 'Google Drive — configuratie vereist',
      'Dropbox — требует настройки': 'Dropbox — configuratie vereist',
      'Доступ': 'Inloggegevens',
      'Новая панель': 'Nieuw paneel',
      'Правила': 'Regels',
      'Назад': 'Terug',
      'Комбинации': 'Toetscombinaties'
    },
    sv: {
      'Куда синхронизировать': 'Synkroniseringsmål',
      'Облако': 'Moln',
      'Выключено': 'Av',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — inget konto krävs (rekommenderas)',
      'Google Drive — требует настройки': 'Google Drive — kräver konfiguration',
      'Dropbox — требует настройки': 'Dropbox — kräver konfiguration',
      'Доступ': 'Inloggningsuppgifter',
      'Новая панель': 'Ny panel',
      'Правила': 'Regler',
      'Назад': 'Tillbaka',
      'Комбинации': 'Kortkommandon'
    },
    fi: {
      'Куда синхронизировать': 'Synkronoinnin kohde',
      'Облако': 'Pilvi',
      'Выключено': 'Pois käytöstä',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — ei vaadi tiliä (suositeltu)',
      'Google Drive — требует настройки': 'Google Drive — vaatii määrityksen',
      'Dropbox — требует настройки': 'Dropbox — vaatii määrityksen',
      'Доступ': 'Kirjautumistiedot',
      'Новая панель': 'Uusi paneeli',
      'Правила': 'Säännöt',
      'Назад': 'Takaisin',
      'Комбинации': 'Pikanäppäimet'
    },
    cs: {
      'Куда синхронизировать': 'Cíl synchronizace',
      'Облако': 'Cloud',
      'Выключено': 'Vypnuto',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — bez účtu (doporučeno)',
      'Google Drive — требует настройки': 'Google Drive — vyžaduje nastavení',
      'Dropbox — требует настройки': 'Dropbox — vyžaduje nastavení',
      'Доступ': 'Přihlašovací údaje',
      'Новая панель': 'Nový panel',
      'Правила': 'Pravidla',
      'Назад': 'Zpět',
      'Комбинации': 'Klávesové zkratky'
    },
    ro: {
      'Куда синхронизировать': 'Destinația sincronizării',
      'Облако': 'Cloud',
      'Выключено': 'Dezactivat',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — fără cont (recomandat)',
      'Google Drive — требует настройки': 'Google Drive — necesită configurare',
      'Dropbox — требует настройки': 'Dropbox — necesită configurare',
      'Доступ': 'Date de autentificare',
      'Новая панель': 'Panou nou',
      'Правила': 'Reguli',
      'Назад': 'Înapoi',
      'Комбинации': 'Combinații de taste'
    },
    el: {
      'Куда синхронизировать': 'Προορισμός συγχρονισμού',
      'Облако': 'Cloud',
      'Выключено': 'Ανενεργό',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — χωρίς λογαριασμό (συνιστάται)',
      'Google Drive — требует настройки': 'Google Drive — απαιτεί ρύθμιση',
      'Dropbox — требует настройки': 'Dropbox — απαιτεί ρύθμιση',
      'Доступ': 'Στοιχεία σύνδεσης',
      'Новая панель': 'Νέο πλαίσιο',
      'Правила': 'Κανόνες',
      'Назад': 'Πίσω',
      'Комбинации': 'Συνδυασμοί πλήκτρων'
    },
    be: {
      'Куда синхронизировать': 'Куды сінхранізаваць',
      'Облако': 'Воблака',
      'Выключено': 'Выключана',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — без уліковага запісу (рэкамендуецца)',
      'Google Drive — требует настройки': 'Google Drive — патрабуе наладкі',
      'Dropbox — требует настройки': 'Dropbox — патрабуе наладкі',
      'Доступ': 'Даныя доступу',
      'Новая панель': 'Новая панэль',
      'Правила': 'Правілы',
      'Назад': 'Назад',
      'Комбинации': 'Спалучэнні клавіш'
    },
    kk: {
      'Куда синхронизировать': 'Қайда синхрондау',
      'Облако': 'Бұлт',
      'Выключено': 'Өшірулі',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — тіркелгісіз (ұсынылады)',
      'Google Drive — требует настройки': 'Google Drive — баптауды қажет етеді',
      'Dropbox — требует настройки': 'Dropbox — баптауды қажет етеді',
      'Доступ': 'Қол жеткізу деректері',
      'Новая панель': 'Жаңа панель',
      'Правила': 'Ережелер',
      'Назад': 'Артқа',
      'Комбинации': 'Пернелер тіркесімі'
    },
    ar: {
      'Куда синхронизировать': 'وجهة المزامنة',
      'Облако': 'السحابة',
      'Выключено': 'إيقاف',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — بلا حساب (موصى به)',
      'Google Drive — требует настройки': 'Google Drive — يتطلب الإعداد',
      'Dropbox — требует настройки': 'Dropbox — يتطلب الإعداد',
      'Доступ': 'بيانات الدخول',
      'Новая панель': 'لوحة جديدة',
      'Правила': 'القواعد',
      'Назад': 'رجوع',
      'Комбинации': 'اختصارات لوحة المفاتيح'
    },
    he: {
      'Куда синхронизировать': 'יעד הסנכרון',
      'Облако': 'ענן',
      'Выключено': 'כבוי',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — ללא חשבון (מומלץ)',
      'Google Drive — требует настройки': 'Google Drive — נדרשת הגדרה',
      'Dropbox — требует настройки': 'Dropbox — נדרשת הגדרה',
      'Доступ': 'פרטי גישה',
      'Новая панель': 'לוח חדש',
      'Правила': 'כללים',
      'Назад': 'חזרה',
      'Комбинации': 'צירופי מקשים'
    },
    zh: {
      'Куда синхронизировать': '同步目标',
      'Облако': '云端',
      'Выключено': '关闭',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — 无需账号（推荐）',
      'Google Drive — требует настройки': 'Google Drive — 需要设置',
      'Dropbox — требует настройки': 'Dropbox — 需要设置',
      'Доступ': '登录凭据',
      'Новая панель': '新面板',
      'Правила': '规则',
      'Назад': '返回',
      'Комбинации': '快捷键组合'
    },
    ja: {
      'Куда синхронизировать': '同期先',
      'Облако': 'クラウド',
      'Выключено': 'オフ',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — アカウント不要（推奨）',
      'Google Drive — требует настройки': 'Google Drive — 設定が必要',
      'Dropbox — требует настройки': 'Dropbox — 設定が必要',
      'Доступ': 'ログイン情報',
      'Новая панель': '新しいパネル',
      'Правила': 'ルール',
      'Назад': '戻る',
      'Комбинации': 'キーの組み合わせ'
    },
    ko: {
      'Куда синхронизировать': '동기화 대상',
      'Облако': '클라우드',
      'Выключено': '끄기',
      'WebDAV — без аккаунта (рекомендуется)': 'WebDAV — 계정 불필요(권장)',
      'Google Drive — требует настройки': 'Google Drive — 설정 필요',
      'Dropbox — требует настройки': 'Dropbox — 설정 필요',
      'Доступ': '로그인 정보',
      'Новая панель': '새 패널',
      'Правила': '규칙',
      'Назад': '뒤로',
      'Комбинации': '키 조합'
    }
  }
  var SETTINGS_TEXT_DICT = {
    uk: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Пароль, яким зашифровано файл у хмарі. Без нього файл не зможе прочитати навіть провайдер. Зберігається лише на цьому пристрої',
      'Адрес файла': 'Адреса файлу',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Дані WebDAV (у Nextcloud — окремий пароль застосунку)',
      'Аккаунт': 'Обліковий запис',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Відкриється сторінка провайдера; після надання дозволу Vio сам отримає токен',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Зібрати закладки, історію та налаштування, зашифрувати й завантажити файл',
      'Загрузить из облака': 'Завантажити з хмари',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Зчитати файл і замінити локальні дані. Не забудьте зберегти поточні, якщо вони потрібні',
      'Автосинк': 'Автосинхронізація',
      'Безвозвратно': 'Безповоротно',
      'Скачать всю память в JSON': 'Завантажити всю пам’ять у JSON',
      'Загрузить память из JSON': 'Імпортувати пам’ять із JSON',
      'Никогда': 'Ніколи',
      'Банки и платёжные сайты': 'Банки та платіжні сайти',
      'Стоп-лист по домену': 'Список блокування за доменом',
      'Не сохраняются': 'Не зберігаються',
      'Показать, что связано по смыслу': 'Показати пов’язані за змістом елементи',
      'Название и адрес сайта': 'Назва й адреса сайту',
      'Максимум 50 000 символов. Сохраняется локально.': 'Максимум 50 000 символів. Зберігається локально.',
      'Удалить все правила': 'Видалити всі правила',
      'Увеличить': 'Збільшити',
      'Уменьшить': 'Зменшити',
      'Вперёд': 'Уперед'
    },
    hi: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'वह पासवर्ड जिससे क्लाउड फ़ाइल एन्क्रिप्ट की गई है। इसके बिना प्रदाता भी फ़ाइल नहीं पढ़ सकता। यह केवल इस डिवाइस पर रखा जाता है',
      'Адрес файла': 'फ़ाइल का पता',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV लॉगिन विवरण (Nextcloud के लिए अलग ऐप पासवर्ड)',
      'Аккаунт': 'खाता',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'प्रदाता का पृष्ठ खुलेगा; अनुमति मिलने के बाद Vio टोकन प्राप्त करेगा',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'बुकमार्क, इतिहास और सेटिंग इकट्ठा करके एन्क्रिप्ट करें और फ़ाइल अपलोड करें',
      'Загрузить из облака': 'क्लाउड से डाउनलोड करें',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'फ़ाइल पढ़कर स्थानीय डेटा बदलें। ज़रूरत हो तो मौजूदा डेटा पहले सहेजें',
      'Автосинк': 'स्वचालित सिंक',
      'Безвозвратно': 'स्थायी रूप से',
      'Скачать всю память в JSON': 'सारी मेमोरी JSON में डाउनलोड करें',
      'Загрузить память из JSON': 'JSON से मेमोरी आयात करें',
      'Никогда': 'कभी नहीं',
      'Банки и платёжные сайты': 'बैंक और भुगतान साइटें',
      'Стоп-лист по домену': 'डोमेन ब्लॉक सूची',
      'Не сохраняются': 'सहेजे नहीं जाते',
      'Показать, что связано по смыслу': 'अर्थ के अनुसार संबंधित चीज़ें दिखाएँ',
      'Название и адрес сайта': 'साइट का नाम और पता',
      'Максимум 50 000 символов. Сохраняется локально.': 'अधिकतम 50,000 अक्षर। स्थानीय रूप से सहेजा जाता है।',
      'Удалить все правила': 'सभी नियम हटाएँ',
      'Увеличить': 'बड़ा करें',
      'Уменьшить': 'छोटा करें',
      'Вперёд': 'आगे'
    },
    en: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Password used to encrypt the cloud file. Without it, even the provider cannot read the file. Stored only on this device',
      'Адрес файла': 'File address',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV credentials (Nextcloud requires a separate app password)',
      'Аккаунт': 'Account',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'The provider page opens; Vio obtains a token after you grant access',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Collect bookmarks, history, and settings, encrypt them, and upload the file',
      'Загрузить из облака': 'Download from cloud',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Read the file and replace local data. Save your current data first if you need it',
      'Автосинк': 'Auto-sync',
      'Безвозвратно': 'Permanently',
      'Скачать всю память в JSON': 'Export all memory as JSON',
      'Загрузить память из JSON': 'Import memory from JSON',
      'Никогда': 'Never',
      'Банки и платёжные сайты': 'Banks and payment sites',
      'Стоп-лист по домену': 'Domain blocklist',
      'Не сохраняются': 'Not saved',
      'Показать, что связано по смыслу': 'Show related items',
      'Название и адрес сайта': 'Website name and address',
      'Максимум 50 000 символов. Сохраняется локально.': 'Maximum 50,000 characters. Stored locally.',
      'Удалить все правила': 'Delete all rules',
      'Увеличить': 'Zoom in',
      'Уменьшить': 'Zoom out',
      'Вперёд': 'Forward'
    },
    de: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Passwort zum Verschlüsseln der Cloud-Datei. Ohne dieses Passwort kann nicht einmal der Anbieter die Datei lesen. Wird nur auf diesem Gerät gespeichert',
      'Адрес файла': 'Dateiadresse',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV-Zugangsdaten (Nextcloud benötigt ein separates App-Passwort)',
      'Аккаунт': 'Konto',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Die Anbieterseite wird geöffnet; nach der Freigabe erhält Vio automatisch ein Token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Lesezeichen, Verlauf und Einstellungen zusammenstellen, verschlüsseln und die Datei hochladen',
      'Загрузить из облака': 'Aus der Cloud herunterladen',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Datei einlesen und lokale Daten ersetzen. Sichern Sie die aktuellen Daten vorher, falls Sie sie behalten möchten',
      'Автосинк': 'Automatische Synchronisierung',
      'Безвозвратно': 'Unwiderruflich',
      'Скачать всю память в JSON': 'Gesamten Speicher als JSON exportieren',
      'Загрузить память из JSON': 'Speicher aus JSON importieren',
      'Никогда': 'Nie',
      'Банки и платёжные сайты': 'Banken und Zahlungsseiten',
      'Стоп-лист по домену': 'Domainsperrliste',
      'Не сохраняются': 'Werden nicht gespeichert',
      'Показать, что связано по смыслу': 'Inhaltlich verwandte Einträge anzeigen',
      'Название и адрес сайта': 'Name und Adresse der Website',
      'Максимум 50 000 символов. Сохраняется локально.': 'Maximal 50.000 Zeichen. Wird lokal gespeichert.',
      'Удалить все правила': 'Alle Regeln löschen',
      'Увеличить': 'Vergrößern',
      'Уменьшить': 'Verkleinern',
      'Вперёд': 'Weiter'
    },
    fr: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Mot de passe utilisé pour chiffrer le fichier cloud. Sans lui, même le fournisseur ne peut pas le lire. Il est conservé uniquement sur cet appareil',
      'Адрес файла': 'Adresse du fichier',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Identifiants WebDAV (Nextcloud nécessite un mot de passe d’application distinct)',
      'Аккаунт': 'Compte',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'La page du fournisseur s’ouvre ; Vio obtient un jeton après votre autorisation',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Rassembler les favoris, l’historique et les paramètres, les chiffrer puis envoyer le fichier',
      'Загрузить из облака': 'Télécharger depuis le cloud',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Lire le fichier et remplacer les données locales. Sauvegardez d’abord les données actuelles si vous souhaitez les garder',
      'Автосинк': 'Synchronisation automatique',
      'Безвозвратно': 'Définitivement',
      'Скачать всю память в JSON': 'Exporter toute la mémoire au format JSON',
      'Загрузить память из JSON': 'Importer la mémoire depuis un fichier JSON',
      'Никогда': 'Jamais',
      'Банки и платёжные сайты': 'Banques et sites de paiement',
      'Стоп-лист по домену': 'Liste de blocage par domaine',
      'Не сохраняются': 'Ne sont pas enregistrés',
      'Показать, что связано по смыслу': 'Afficher les éléments liés par leur sens',
      'Название и адрес сайта': 'Nom et adresse du site',
      'Максимум 50 000 символов. Сохраняется локально.': '50 000 caractères maximum. Enregistré localement.',
      'Удалить все правила': 'Supprimer toutes les règles',
      'Увеличить': 'Agrandir',
      'Уменьшить': 'Réduire',
      'Вперёд': 'Suivant'
    },
    es: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Contraseña que cifra el archivo en la nube. Sin ella, ni siquiera el proveedor puede leerlo. Solo se guarda en este dispositivo',
      'Адрес файла': 'Dirección del archivo',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Credenciales de WebDAV (Nextcloud requiere una contraseña de aplicación independiente)',
      'Аккаунт': 'Cuenta',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Se abre la página del proveedor; Vio obtiene un token cuando concedas el acceso',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Reunir marcadores, historial y ajustes, cifrarlos y subir el archivo',
      'Загрузить из облака': 'Descargar de la nube',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Leer el archivo y sustituir los datos locales. Guarda primero los datos actuales si quieres conservarlos',
      'Автосинк': 'Sincronización automática',
      'Безвозвратно': 'De forma permanente',
      'Скачать всю память в JSON': 'Exportar toda la memoria en JSON',
      'Загрузить память из JSON': 'Importar memoria desde JSON',
      'Никогда': 'Nunca',
      'Банки и платёжные сайты': 'Bancos y sitios de pago',
      'Стоп-лист по домену': 'Lista de bloqueo por dominio',
      'Не сохраняются': 'No se guardan',
      'Показать, что связано по смыслу': 'Mostrar elementos relacionados',
      'Название и адрес сайта': 'Nombre y dirección del sitio',
      'Максимум 50 000 символов. Сохраняется локально.': 'Máximo de 50 000 caracteres. Se guarda localmente.',
      'Удалить все правила': 'Eliminar todas las reglas',
      'Увеличить': 'Ampliar',
      'Уменьшить': 'Reducir',
      'Вперёд': 'Adelante'
    },
    it: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Password usata per cifrare il file nel cloud. Senza di essa, neanche il provider può leggerlo. È conservata solo su questo dispositivo',
      'Адрес файла': 'Indirizzo del file',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Credenziali WebDAV (Nextcloud richiede una password per app separata)',
      'Аккаунт': 'Account',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Si apre la pagina del provider; dopo l’autorizzazione Vio riceverà un token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Raccogliere segnalibri, cronologia e impostazioni, cifrarli e caricare il file',
      'Загрузить из облака': 'Scarica dal cloud',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Leggere il file e sostituire i dati locali. Salva prima i dati attuali se vuoi conservarli',
      'Автосинк': 'Sincronizzazione automatica',
      'Безвозвратно': 'In modo permanente',
      'Скачать всю память в JSON': 'Esporta tutta la memoria in JSON',
      'Загрузить память из JSON': 'Importa la memoria da JSON',
      'Никогда': 'Mai',
      'Банки и платёжные сайты': 'Banche e siti di pagamento',
      'Стоп-лист по домену': 'Elenco di blocco per dominio',
      'Не сохраняются': 'Non vengono salvati',
      'Показать, что связано по смыслу': 'Mostra gli elementi correlati',
      'Название и адрес сайта': 'Nome e indirizzo del sito',
      'Максимум 50 000 символов. Сохраняется локально.': 'Massimo 50.000 caratteri. Salvato localmente.',
      'Удалить все правила': 'Elimina tutte le regole',
      'Увеличить': 'Ingrandisci',
      'Уменьшить': 'Riduci',
      'Вперёд': 'Avanti'
    },
    pt: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Senha usada para criptografar o arquivo na nuvem. Sem ela, nem o provedor consegue ler o arquivo. Fica armazenada apenas neste dispositivo',
      'Адрес файла': 'Endereço do arquivo',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Credenciais WebDAV (o Nextcloud exige uma senha de aplicação separada)',
      'Аккаунт': 'Conta',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'A página do provedor será aberta; após autorizar, o Vio obterá um token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Reunir favoritos, histórico e configurações, criptografar e enviar o arquivo',
      'Загрузить из облака': 'Baixar da nuvem',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Ler o arquivo e substituir os dados locais. Salve os dados atuais antes, se quiser mantê-los',
      'Автосинк': 'Sincronização automática',
      'Безвозвратно': 'Permanentemente',
      'Скачать всю память в JSON': 'Exportar toda a memória em JSON',
      'Загрузить память из JSON': 'Importar memória de JSON',
      'Никогда': 'Nunca',
      'Банки и платёжные сайты': 'Bancos e sites de pagamento',
      'Стоп-лист по домену': 'Lista de bloqueio por domínio',
      'Не сохраняются': 'Não são guardados',
      'Показать, что связано по смыслу': 'Mostrar itens relacionados',
      'Название и адрес сайта': 'Nome e endereço do site',
      'Максимум 50 000 символов. Сохраняется локально.': 'Máximo de 50.000 caracteres. Guardado localmente.',
      'Удалить все правила': 'Eliminar todas as regras',
      'Увеличить': 'Aumentar',
      'Уменьшить': 'Diminuir',
      'Вперёд': 'Avançar'
    },
    pl: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Hasło szyfrujące plik w chmurze. Bez niego nawet dostawca nie może odczytać pliku. Jest przechowywane tylko na tym urządzeniu',
      'Адрес файла': 'Adres pliku',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Dane logowania WebDAV (Nextcloud wymaga osobnego hasła aplikacji)',
      'Аккаунт': 'Konto',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Otworzy się strona dostawcy; po udzieleniu zgody Vio pobierze token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Zebrać zakładki, historię i ustawienia, zaszyfrować je i przesłać plik',
      'Загрузить из облака': 'Pobierz z chmury',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Odczytać plik i zastąpić dane lokalne. Najpierw zapisz obecne dane, jeśli chcesz je zachować',
      'Автосинк': 'Automatyczna synchronizacja',
      'Безвозвратно': 'Nieodwracalnie',
      'Скачать всю память в JSON': 'Wyeksportuj całą pamięć do JSON',
      'Загрузить память из JSON': 'Zaimportuj pamięć z JSON',
      'Никогда': 'Nigdy',
      'Банки и платёжные сайты': 'Banki i serwisy płatnicze',
      'Стоп-лист по домену': 'Lista blokowanych domen',
      'Не сохраняются': 'Nie są zapisywane',
      'Показать, что связано по смыслу': 'Pokaż powiązane elementy',
      'Название и адрес сайта': 'Nazwa i adres strony',
      'Максимум 50 000 символов. Сохраняется локально.': 'Maksymalnie 50 000 znaków. Dane są zapisywane lokalnie.',
      'Удалить все правила': 'Usuń wszystkie reguły',
      'Увеличить': 'Powiększ',
      'Уменьшить': 'Pomniejsz',
      'Вперёд': 'Dalej'
    },
    tr: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Bulut dosyasını şifreleyen parola. Bu parola olmadan sağlayıcı bile dosyayı okuyamaz. Yalnızca bu cihazda saklanır',
      'Адрес файла': 'Dosya adresi',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV kimlik bilgileri (Nextcloud için ayrı bir uygulama parolası gerekir)',
      'Аккаунт': 'Hesap',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Sağlayıcının sayfası açılır; izin verdiğinizde Vio bir belirteç alır',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Yer imlerini, geçmişi ve ayarları toplayıp şifreleyin ve dosyayı yükleyin',
      'Загрузить из облака': 'Buluttan indir',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Dosyayı okuyup yerel verilerin yerine koyun. Gerekirse mevcut verileri önce kaydedin',
      'Автосинк': 'Otomatik eşitleme',
      'Безвозвратно': 'Kalıcı olarak',
      'Скачать всю память в JSON': 'Tüm belleği JSON olarak dışa aktar',
      'Загрузить память из JSON': 'Belleği JSON dosyasından içe aktar',
      'Никогда': 'Asla',
      'Банки и платёжные сайты': 'Bankalar ve ödeme siteleri',
      'Стоп-лист по домену': 'Etki alanı engelleme listesi',
      'Не сохраняются': 'Kaydedilmez',
      'Показать, что связано по смыслу': 'Anlamca ilişkili öğeleri göster',
      'Название и адрес сайта': 'Site adı ve adresi',
      'Максимум 50 000 символов. Сохраняется локально.': 'En fazla 50.000 karakter. Yerel olarak saklanır.',
      'Удалить все правила': 'Tüm kuralları sil',
      'Увеличить': 'Yakınlaştır',
      'Уменьшить': 'Uzaklaştır',
      'Вперёд': 'İleri'
    },
    nl: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Wachtwoord waarmee het cloudbestand is versleuteld. Zonder dit wachtwoord kan zelfs de provider het bestand niet lezen. Alleen op dit apparaat opgeslagen',
      'Адрес файла': 'Bestandsadres',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV-inloggegevens (Nextcloud vereist een apart app-wachtwoord)',
      'Аккаунт': 'Account',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'De providerpagina wordt geopend; na toestemming haalt Vio zelf een token op',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Bladwijzers, geschiedenis en instellingen verzamelen, versleutelen en het bestand uploaden',
      'Загрузить из облака': 'Downloaden uit de cloud',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Het bestand lezen en lokale gegevens vervangen. Sla de huidige gegevens eerst op als je ze wilt behouden',
      'Автосинк': 'Automatische synchronisatie',
      'Безвозвратно': 'Onherroepelijk',
      'Скачать всю память в JSON': 'Alle geheugen exporteren als JSON',
      'Загрузить память из JSON': 'Geheugen importeren uit JSON',
      'Никогда': 'Nooit',
      'Банки и платёжные сайты': 'Banken en betaalsites',
      'Стоп-лист по домену': 'Domeinblokkeerlijst',
      'Не сохраняются': 'Worden niet opgeslagen',
      'Показать, что связано по смыслу': 'Inhoudelijk verwante items tonen',
      'Название и адрес сайта': 'Naam en adres van de website',
      'Максимум 50 000 символов. Сохраняется локально.': 'Maximaal 50.000 tekens. Lokaal opgeslagen.',
      'Удалить все правила': 'Alle regels verwijderen',
      'Увеличить': 'Inzoomen',
      'Уменьшить': 'Uitzoomen',
      'Вперёд': 'Verder'
    },
    sv: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Lösenordet som krypterar molnfilen. Utan det kan inte ens leverantören läsa filen. Sparas endast på den här enheten',
      'Адрес файла': 'Filadress',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV-inloggningsuppgifter (Nextcloud kräver ett separat applösenord)',
      'Аккаунт': 'Konto',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Leverantörens sida öppnas; när du godkänner hämtar Vio en token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Samla bokmärken, historik och inställningar, kryptera dem och ladda upp filen',
      'Загрузить из облака': 'Hämta från molnet',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Läs in filen och ersätt lokala data. Spara nuvarande data först om du vill behålla dem',
      'Автосинк': 'Automatisk synkronisering',
      'Безвозвратно': 'Permanent',
      'Скачать всю память в JSON': 'Exportera allt minne som JSON',
      'Загрузить память из JSON': 'Importera minne från JSON',
      'Никогда': 'Aldrig',
      'Банки и платёжные сайты': 'Banker och betalsidor',
      'Стоп-лист по домену': 'Blockeringslista per domän',
      'Не сохраняются': 'Sparas inte',
      'Показать, что связано по смыслу': 'Visa relaterade objekt',
      'Название и адрес сайта': 'Webbplatsens namn och adress',
      'Максимум 50 000 символов. Сохраняется локально.': 'Högst 50 000 tecken. Sparas lokalt.',
      'Удалить все правила': 'Ta bort alla regler',
      'Увеличить': 'Zooma in',
      'Уменьшить': 'Zooma ut',
      'Вперёд': 'Framåt'
    },
    fi: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Salasana, jolla pilvitiedosto salataan. Ilman sitä edes palveluntarjoaja ei voi lukea tiedostoa. Tallennetaan vain tähän laitteeseen',
      'Адрес файла': 'Tiedoston osoite',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV-tunnistetiedot (Nextcloud vaatii erillisen sovellussalasanan)',
      'Аккаунт': 'Tili',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Palveluntarjoajan sivu avautuu; luvan jälkeen Vio noutaa tunnisteen',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Kokoa kirjanmerkit, historia ja asetukset, salaa ne ja lataa tiedosto',
      'Загрузить из облака': 'Lataa pilvestä',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Lue tiedosto ja korvaa paikalliset tiedot. Tallenna nykyiset tiedot ensin, jos haluat säilyttää ne',
      'Автосинк': 'Automaattinen synkronointi',
      'Безвозвратно': 'Pysyvästi',
      'Скачать всю память в JSON': 'Vie kaikki muisti JSON-muodossa',
      'Загрузить память из JSON': 'Tuo muisti JSON-tiedostosta',
      'Никогда': 'Ei koskaan',
      'Банки и платёжные сайты': 'Pankki- ja maksusivustot',
      'Стоп-лист по домену': 'Verkkotunnusten estolista',
      'Не сохраняются': 'Ei tallenneta',
      'Показать, что связано по смыслу': 'Näytä aiheeseen liittyvät kohteet',
      'Название и адрес сайта': 'Sivuston nimi ja osoite',
      'Максимум 50 000 символов. Сохраняется локально.': 'Enintään 50 000 merkkiä. Tallennetaan paikallisesti.',
      'Удалить все правила': 'Poista kaikki säännöt',
      'Увеличить': 'Lähennä',
      'Уменьшить': 'Loitonna',
      'Вперёд': 'Eteenpäin'
    },
    cs: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Heslo, kterým je šifrován soubor v cloudu. Bez něj soubor nepřečte ani poskytovatel. Ukládá se pouze v tomto zařízení',
      'Адрес файла': 'Adresa souboru',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Přihlašovací údaje WebDAV (Nextcloud vyžaduje samostatné heslo aplikace)',
      'Аккаунт': 'Účet',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Otevře se stránka poskytovatele; po udělení přístupu Vio získá token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Shromáždit záložky, historii a nastavení, zašifrovat je a nahrát soubor',
      'Загрузить из облака': 'Stáhnout z cloudu',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Načíst soubor a nahradit místní data. Pokud je chcete zachovat, nejprve je uložte',
      'Автосинк': 'Automatická synchronizace',
      'Безвозвратно': 'Nevratně',
      'Скачать всю память в JSON': 'Exportovat celou paměť do JSON',
      'Загрузить память из JSON': 'Importovat paměť z JSON',
      'Никогда': 'Nikdy',
      'Банки и платёжные сайты': 'Banky a platební weby',
      'Стоп-лист по домену': 'Seznam blokovaných domén',
      'Не сохраняются': 'Neukládají se',
      'Показать, что связано по смыслу': 'Zobrazit související položky',
      'Название и адрес сайта': 'Název a adresa webu',
      'Максимум 50 000 символов. Сохраняется локально.': 'Nejvýše 50 000 znaků. Ukládá se místně.',
      'Удалить все правила': 'Smazat všechna pravidla',
      'Увеличить': 'Zvětšit',
      'Уменьшить': 'Zmenšit',
      'Вперёд': 'Vpřed'
    },
    ro: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Parola care criptează fișierul din cloud. Fără ea, nici furnizorul nu poate citi fișierul. Este păstrată doar pe acest dispozitiv',
      'Адрес файла': 'Adresa fișierului',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Date de autentificare WebDAV (Nextcloud necesită o parolă separată pentru aplicație)',
      'Аккаунт': 'Cont',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Se deschide pagina furnizorului; după autorizare, Vio obține un token',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Colectează marcajele, istoricul și setările, criptează-le și încarcă fișierul',
      'Загрузить из облака': 'Descarcă din cloud',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Citește fișierul și înlocuiește datele locale. Salvează mai întâi datele actuale dacă vrei să le păstrezi',
      'Автосинк': 'Sincronizare automată',
      'Безвозвратно': 'Irevocabil',
      'Скачать всю память в JSON': 'Exportă toată memoria în JSON',
      'Загрузить память из JSON': 'Importă memoria din JSON',
      'Никогда': 'Niciodată',
      'Банки и платёжные сайты': 'Bănci și site-uri de plăți',
      'Стоп-лист по домену': 'Listă de blocare după domeniu',
      'Не сохраняются': 'Nu se salvează',
      'Показать, что связано по смыслу': 'Afișează elementele asociate',
      'Название и адрес сайта': 'Numele și adresa site-ului',
      'Максимум 50 000 символов. Сохраняется локально.': 'Maximum 50.000 de caractere. Se salvează local.',
      'Удалить все правила': 'Șterge toate regulile',
      'Увеличить': 'Mărește',
      'Уменьшить': 'Micșorează',
      'Вперёд': 'Înainte'
    },
    el: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Κωδικός πρόσβασης που κρυπτογραφεί το αρχείο στο cloud. Χωρίς αυτόν, ούτε ο πάροχος μπορεί να διαβάσει το αρχείο. Αποθηκεύεται μόνο σε αυτή τη συσκευή',
      'Адрес файла': 'Διεύθυνση αρχείου',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Στοιχεία σύνδεσης WebDAV (το Nextcloud απαιτεί ξεχωριστό κωδικό εφαρμογής)',
      'Аккаунт': 'Λογαριασμός',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Ανοίγει η σελίδα του παρόχου· μετά την έγκρισή σας, το Vio λαμβάνει ένα διακριτικό',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Συλλογή σελιδοδεικτών, ιστορικού και ρυθμίσεων, κρυπτογράφηση και μεταφόρτωση του αρχείου',
      'Загрузить из облака': 'Λήψη από το cloud',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Ανάγνωση του αρχείου και αντικατάσταση των τοπικών δεδομένων. Αποθηκεύστε πρώτα τα τρέχοντα αν θέλετε να τα διατηρήσετε',
      'Автосинк': 'Αυτόματος συγχρονισμός',
      'Безвозвратно': 'Οριστικά',
      'Скачать всю память в JSON': 'Εξαγωγή όλης της μνήμης σε JSON',
      'Загрузить память из JSON': 'Εισαγωγή μνήμης από JSON',
      'Никогда': 'Ποτέ',
      'Банки и платёжные сайты': 'Τράπεζες και ιστότοποι πληρωμών',
      'Стоп-лист по домену': 'Λίστα αποκλεισμού ανά τομέα',
      'Не сохраняются': 'Δεν αποθηκεύονται',
      'Показать, что связано по смыслу': 'Εμφάνιση σχετικών στοιχείων',
      'Название и адрес сайта': 'Όνομα και διεύθυνση ιστότοπου',
      'Максимум 50 000 символов. Сохраняется локально.': 'Έως 50.000 χαρακτήρες. Αποθηκεύεται τοπικά.',
      'Удалить все правила': 'Διαγραφή όλων των κανόνων',
      'Увеличить': 'Μεγέθυνση',
      'Уменьшить': 'Σμίκρυνση',
      'Вперёд': 'Εμπρός'
    },
    be: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Пароль, якім зашыфраваны файл у воблаку. Без яго файл не зможа прачытаць нават правайдар. Захоўваецца толькі на гэтай прыладзе',
      'Адрес файла': 'Адрас файла',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'Даныя WebDAV (для Nextcloud патрэбны асобны пароль праграмы)',
      'Аккаунт': 'Уліковы запіс',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Адкрыецца старонка правайдара; пасля дазволу Vio сам атрымае токен',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Сабраць закладкі, гісторыю і налады, зашыфраваць і загрузіць файл',
      'Загрузить из облака': 'Загрузіць з воблака',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Прачытаць файл і замяніць лакальныя даныя. Спачатку захавайце бягучыя даныя, калі яны патрэбныя',
      'Автосинк': 'Аўтасінхранізацыя',
      'Безвозвратно': 'Беззваротна',
      'Скачать всю память в JSON': 'Экспартаваць усю памяць у JSON',
      'Загрузить память из JSON': 'Імпартаваць памяць з JSON',
      'Никогда': 'Ніколі',
      'Банки и платёжные сайты': 'Банкі і плацежныя сайты',
      'Стоп-лист по домену': 'Спіс блакіроўкі даменаў',
      'Не сохраняются': 'Не захоўваюцца',
      'Показать, что связано по смыслу': 'Паказаць звязаныя паводле сэнсу элементы',
      'Название и адрес сайта': 'Назва і адрас сайта',
      'Максимум 50 000 символов. Сохраняется локально.': 'Максімум 50 000 сімвалаў. Захоўваецца лакальна.',
      'Удалить все правила': 'Выдаліць усе правілы',
      'Увеличить': 'Павялічыць',
      'Уменьшить': 'Паменшыць',
      'Вперёд': 'Наперад'
    },
    kk: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'Бұлттағы файлды шифрлайтын құпиясөз. Онсыз провайдердің өзі де файлды оқи алмайды. Тек осы құрылғыда сақталады',
      'Адрес файла': 'Файл мекенжайы',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV тіркелгі деректері (Nextcloud үшін бөлек қолданба құпиясөзі қажет)',
      'Аккаунт': 'Тіркелгі',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'Провайдердің беті ашылады; рұқсат бергеннен кейін Vio токенді өзі алады',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'Бетбелгілерді, тарихты және баптауларды жинап, шифрлап, файлды жүктеу',
      'Загрузить из облака': 'Бұлттан жүктеу',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'Файлды оқып, жергілікті деректерді ауыстыру. Қажет болса, алдымен ағымдағы деректерді сақтаңыз',
      'Автосинк': 'Автоматты синхрондау',
      'Безвозвратно': 'Қайтарылмайды',
      'Скачать всю память в JSON': 'Барлық жадты JSON ретінде экспорттау',
      'Загрузить память из JSON': 'Жадты JSON файлынан импорттау',
      'Никогда': 'Ешқашан',
      'Банки и платёжные сайты': 'Банктер мен төлем сайттары',
      'Стоп-лист по домену': 'Домендерге арналған бұғаттау тізімі',
      'Не сохраняются': 'Сақталмайды',
      'Показать, что связано по смыслу': 'Мағынасы бойынша байланысты элементтерді көрсету',
      'Название и адрес сайта': 'Сайт атауы мен мекенжайы',
      'Максимум 50 000 символов. Сохраняется локально.': 'Ең көбі 50 000 таңба. Құрылғыда сақталады.',
      'Удалить все правила': 'Барлық ережені жою',
      'Увеличить': 'Үлкейту',
      'Уменьшить': 'Кішірейту',
      'Вперёд': 'Алға'
    },
    ar: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'كلمة المرور التي تشفّر الملف السحابي. من دونها، لن يتمكن حتى موفّر الخدمة من قراءته. تُحفظ على هذا الجهاز فقط',
      'Адрес файла': 'عنوان الملف',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'بيانات اعتماد WebDAV (يتطلب Nextcloud كلمة مرور تطبيق منفصلة)',
      'Аккаунт': 'الحساب',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'تُفتح صفحة موفّر الخدمة؛ وبعد منح الإذن، يحصل Vio على رمز وصول',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'جمع الإشارات المرجعية والسجل والإعدادات، ثم تشفيرها ورفع الملف',
      'Загрузить из облака': 'التنزيل من السحابة',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'قراءة الملف واستبدال البيانات المحلية. احفظ البيانات الحالية أولًا إذا كنت تريد الاحتفاظ بها',
      'Автосинк': 'مزامنة تلقائية',
      'Безвозвратно': 'نهائيًا',
      'Скачать всю память в JSON': 'تصدير كل الذاكرة بتنسيق JSON',
      'Загрузить память из JSON': 'استيراد الذاكرة من JSON',
      'Никогда': 'مطلقًا',
      'Банки и платёжные сайты': 'المصارف ومواقع الدفع',
      'Стоп-лист по домену': 'قائمة حظر النطاقات',
      'Не сохраняются': 'لا يتم حفظها',
      'Показать, что связано по смыслу': 'عرض العناصر المرتبطة بالمعنى',
      'Название и адрес сайта': 'اسم الموقع وعنوانه',
      'Максимум 50 000 символов. Сохраняется локально.': 'الحد الأقصى 50,000 حرف. يُحفظ محليًا.',
      'Удалить все правила': 'حذف جميع القواعد',
      'Увеличить': 'تكبير',
      'Уменьшить': 'تصغير',
      'Вперёд': 'للأمام'
    },
    he: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'הסיסמה שמצפינה את הקובץ בענן. בלעדיה, אפילו הספק לא יכול לקרוא את הקובץ. נשמרת במכשיר הזה בלבד',
      'Адрес файла': 'כתובת הקובץ',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'פרטי הגישה ל-WebDAV (ב-Nextcloud נדרשת סיסמת יישום נפרדת)',
      'Аккаунт': 'חשבון',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'דף הספק נפתח; לאחר מתן הרשאה, Vio יקבל אסימון',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'איסוף הסימניות, ההיסטוריה וההגדרות, הצפנתן והעלאת הקובץ',
      'Загрузить из облака': 'הורדה מהענן',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'קריאת הקובץ והחלפת הנתונים המקומיים. יש לשמור תחילה את הנתונים הנוכחיים אם רוצים לשמור אותם',
      'Автосинк': 'סנכרון אוטומטי',
      'Безвозвратно': 'לצמיתות',
      'Скачать всю память в JSON': 'ייצוא כל הזיכרון ל-JSON',
      'Загрузить память из JSON': 'ייבוא זיכרון מ-JSON',
      'Никогда': 'לעולם לא',
      'Банки и платёжные сайты': 'בנקים ואתרי תשלומים',
      'Стоп-лист по домену': 'רשימת חסימה לפי דומיין',
      'Не сохраняются': 'לא נשמרים',
      'Показать, что связано по смыслу': 'הצגת פריטים קשורים',
      'Название и адрес сайта': 'שם האתר והכתובת שלו',
      'Максимум 50 000 символов. Сохраняется локально.': 'עד 50,000 תווים. נשמר מקומית.',
      'Удалить все правила': 'מחיקת כל הכללים',
      'Увеличить': 'הגדלה',
      'Уменьшить': 'הקטנה',
      'Вперёд': 'הבא'
    },
    zh: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': '用于加密云端文件的密码。没有它，即使服务提供商也无法读取文件。密码仅保存在此设备上',
      'Адрес файла': '文件地址',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV 凭据（Nextcloud 需要单独的应用密码）',
      'Аккаунт': '账号',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': '将打开服务提供商页面；授权后 Vio 会自动获取令牌',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': '收集书签、历史记录和设置，加密后上传文件',
      'Загрузить из облака': '从云端下载',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': '读取文件并替换本地数据。如需保留当前数据，请先保存',
      'Автосинк': '自动同步',
      'Безвозвратно': '永久删除',
      'Скачать всю память в JSON': '将全部记忆导出为 JSON',
      'Загрузить память из JSON': '从 JSON 导入记忆',
      'Никогда': '从不',
      'Банки и платёжные сайты': '银行和支付网站',
      'Стоп-лист по домену': '域名屏蔽列表',
      'Не сохраняются': '不会保存',
      'Показать, что связано по смыслу': '显示相关内容',
      'Название и адрес сайта': '网站名称和地址',
      'Максимум 50 000 символов. Сохраняется локально.': '最多 50,000 个字符。仅保存在本地。',
      'Удалить все правила': '删除所有规则',
      'Увеличить': '放大',
      'Уменьшить': '缩小',
      'Вперёд': '前进'
    },
    ja: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': 'クラウドファイルの暗号化に使うパスワードです。これがないとプロバイダーもファイルを読めません。このデバイスだけに保存されます',
      'Адрес файла': 'ファイルのアドレス',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV の認証情報（Nextcloud では専用のアプリパスワードが必要です）',
      'Аккаунт': 'アカウント',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': 'プロバイダーのページが開き、許可すると Vio がトークンを取得します',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': 'ブックマーク、履歴、設定をまとめて暗号化し、ファイルをアップロードします',
      'Загрузить из облака': 'クラウドからダウンロード',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': 'ファイルを読み込み、ローカルデータを置き換えます。現在のデータが必要な場合は先に保存してください',
      'Автосинк': '自動同期',
      'Безвозвратно': '完全に削除',
      'Скачать всю память в JSON': 'すべてのメモリーを JSON でエクスポート',
      'Загрузить память из JSON': 'JSON からメモリーをインポート',
      'Никогда': 'なし',
      'Банки и платёжные сайты': '銀行・決済サイト',
      'Стоп-лист по домену': 'ドメインのブロックリスト',
      'Не сохраняются': '保存されません',
      'Показать, что связано по смыслу': '関連項目を表示',
      'Название и адрес сайта': 'サイト名とアドレス',
      'Максимум 50 000 символов. Сохраняется локально.': '最大 50,000 文字。ローカルに保存されます。',
      'Удалить все правила': 'すべてのルールを削除',
      'Увеличить': '拡大',
      'Уменьшить': '縮小',
      'Вперёд': '進む'
    },
    ko: {
      'Пароль, которым зашифрован файл в облаке. Без него файл нечитаем даже у провайдера. Хранится только на этом устройстве': '클라우드 파일을 암호화하는 비밀번호입니다. 비밀번호가 없으면 제공업체도 파일을 읽을 수 없습니다. 이 기기에만 저장됩니다',
      'Адрес файла': '파일 주소',
      'Учётные данные WebDAV (у Nextcloud — отдельный пароль приложения)': 'WebDAV 로그인 정보(Nextcloud는 별도의 앱 비밀번호가 필요합니다)',
      'Аккаунт': '계정',
      'Открывается страница провайдера; после разрешения Vio сам получит токен': '제공업체 페이지가 열립니다. 권한을 허용하면 Vio가 토큰을 가져옵니다',
      'Собрать закладки, историю и настройки, зашифровать и загрузить файл': '북마크, 방문 기록, 설정을 모아 암호화한 뒤 파일을 업로드합니다',
      'Загрузить из облака': '클라우드에서 다운로드',
      'Считать файл и заменить локальные данные. Не забудьте сохранить текущие, если они нужны': '파일을 읽어 로컬 데이터를 바꿉니다. 현재 데이터가 필요하면 먼저 저장하세요',
      'Автосинк': '자동 동기화',
      'Безвозвратно': '영구적으로',
      'Скачать всю память в JSON': '모든 메모리를 JSON으로 내보내기',
      'Загрузить память из JSON': 'JSON에서 메모리 가져오기',
      'Никогда': '안 함',
      'Банки и платёжные сайты': '은행 및 결제 사이트',
      'Стоп-лист по домену': '도메인 차단 목록',
      'Не сохраняются': '저장되지 않음',
      'Показать, что связано по смыслу': '관련 항목 표시',
      'Название и адрес сайта': '사이트 이름 및 주소',
      'Максимум 50 000 символов. Сохраняется локально.': '최대 50,000자입니다. 로컬에 저장됩니다.',
      'Удалить все правила': '모든 규칙 삭제',
      'Увеличить': '확대',
      'Уменьшить': '축소',
      'Вперёд': '앞으로'
    }
  }
  Object.keys(SETTINGS_DICT).forEach(function (L) {
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, SETTINGS_DICT[L])
  })
  Object.keys(SETTINGS_IMPORT_DICT).forEach(function (L) {
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, SETTINGS_IMPORT_DICT[L])
  })
  Object.keys(SETTINGS_MORE_DICT).forEach(function (L) {
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, SETTINGS_MORE_DICT[L])
  })
  Object.keys(SETTINGS_TEXT_DICT).forEach(function (L) {
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, SETTINGS_TEXT_DICT[L])
  })
  var PAGE_UI_KEYS = [
    'Ночь — тишина и быстрые решения.',
    'Доброе утро — начните с одного важного дела.',
    'День в работе — держите фокус и быстрые ответы.',
    'Вечер — время спокойных вкладок и чистого мышления.',
    'Импорт',
    'Свой CSS',
    'Автоматизация',
    'Личный контекст',
    'Новая web-панель',
    'Формат: Ctrl+Shift+X',
    'Снизу',
    'Справа',
    'Адресная строка',
    'Сверху или снизу',
    'Баланс, фокус или творчество',
    'Баланс',
    'Фокус',
    'Творчество',
    'Приветствие на стартовой странице',
    'Смена фраз по времени суток',
    'Плотнее и меньше лишних блоков',
    'Быстрые действия',
    'Панель с приватной вкладкой и настройками',
    'Бесплатный ключ Google AI Studio (aistudio.google.com → Get API key): модель читает текст со скриншотов, капчи и графики. Если ключ заполнен — снимок экрана уходит в Google; ключа нет — снимок не покидает устройство',
    'Groq — запасной',
    'Без ключей',
    'Работает локальный OCR — распознаёт текст на устройстве, без интернета и регистрации',
    'Перетащите файл',
    'Скачанный .crx или .zip из магазина расширений — просто перетащите в эту область',
    'Фильтр',
    'По названию, версии, пути или ошибке загрузки',
    'Результат',
    'Список',
    'Найденные повторы',
    'Что ИИ знает',
    'Запросов запомнено',
    'Расширение запрашивает опасные разрешения',
    'Всё равно установить',
    'Не удалось проверить расширение:',
    'Это расширение уже добавлено',
    'Расширение установлено',
    'Не удалось установить:',
    'Список недоступен',
    'Включить память браузера?',
    'Удалить ВСЮ память?',
    'Память стёрта',
    'страниц',
    'Строю…',
    'стр.,',
    'Построить',
    'Удалено:',
    'Импортировано:'
  ]
  /* Parallel arrays keep the remaining static page copy together; the index is
     checked below so a missing phrase can never silently shift translations. */
  var PAGE_UI_VALUES = {
    uk: [
      'Ніч — тиша та швидкі рішення.', 'Доброго ранку — почніть з однієї важливої справи.',
      'День у роботі — зберігайте фокус і швидко знаходьте відповіді.', 'Вечір — час спокійних вкладок і ясних думок.',
      'Імпорт', 'Власний CSS', 'Автоматизація', 'Особистий контекст', 'Нова вебпанель',
      'Формат: Ctrl+Shift+X', 'Знизу', 'Праворуч', 'Адресний рядок', 'Зверху або знизу',
      'Баланс, фокус або творчість', 'Баланс', 'Фокус', 'Творчість', 'Привітання на стартовій сторінці',
      'Зміна фраз залежно від часу доби', 'Щільніше й менше зайвих блоків', 'Швидкі дії',
      'Панель із приватною вкладкою та налаштуваннями',
      'Безкоштовний ключ Google AI Studio (aistudio.google.com → Get API key): модель читає текст зі знімків екрана, капч і графіків. Якщо ключ заповнено — знімок екрана надсилається до Google; без ключа знімок не залишає пристрій.',
      'Резервний Groq', 'Без ключів',
      'Працює локальний OCR — розпізнає текст на пристрої, без інтернету й реєстрації',
      'Перетягніть файл', 'Завантажений із магазину розширень файл .crx або .zip — просто перетягніть його сюди',
      'Фільтр', 'За назвою, версією, шляхом або помилкою завантаження', 'Результат', 'Список',
      'Знайдені повтори', 'Що знає ШІ', 'Запам’ятано запитів', 'Розширення запитує небезпечні дозволи',
      'Усе одно встановити', 'Не вдалося перевірити розширення:', 'Це розширення вже додано',
      'Розширення встановлено', 'Не вдалося встановити:', 'Список недоступний',
      'Увімкнути пам’ять браузера?', 'Видалити ВСЮ пам’ять?', 'Пам’ять стерто', 'сторінок',
      'Створюю…', 'стор.,', 'Побудувати', 'Видалено:', 'Імпортовано:'
    ],
    hi: [
      'रात — शांति और तेज़ फ़ैसले।', 'सुप्रभात — एक ज़रूरी काम से शुरुआत करें।',
      'दिन का काम — ध्यान बनाए रखें और तुरंत जवाब पाएँ।', 'शाम — शांत टैब और स्पष्ट विचारों का समय।',
      'आयात', 'कस्टम CSS', 'स्वचालन', 'निजी संदर्भ', 'नया वेब पैनल', 'फ़ॉर्मैट: Ctrl+Shift+X',
      'नीचे', 'दाईं ओर', 'पता बार', 'ऊपर या नीचे', 'संतुलन, ध्यान या रचनात्मकता',
      'संतुलन', 'ध्यान', 'रचनात्मकता', 'नए टैब पर अभिवादन', 'दिन के समय के अनुसार संदेश बदलें',
      'अधिक सघन, कम अनावश्यक अनुभाग', 'त्वरित कार्रवाइयाँ', 'निजी टैब और सेटिंग वाला पैनल',
      'मुफ़्त Google AI Studio कुंजी (aistudio.google.com → Get API key): मॉडल स्क्रीनशॉट, CAPTCHA और चार्ट से पाठ पढ़ता है। कुंजी भरने पर स्क्रीनशॉट Google को भेजा जाता है; कुंजी न होने पर वह डिवाइस से बाहर नहीं जाता।',
      'वैकल्पिक Groq', 'कुंजी के बिना', 'स्थानीय OCR डिवाइस पर पाठ पहचानता है; इंटरनेट या पंजीकरण की ज़रूरत नहीं।',
      'फ़ाइल यहाँ छोड़ें', 'एक्सटेंशन स्टोर से डाउनलोड की गई .crx या .zip फ़ाइल को यहाँ खींचें',
      'फ़िल्टर', 'नाम, संस्करण, पथ या लोड त्रुटि से', 'परिणाम', 'सूची', 'मिले हुए दोहराव',
      'AI क्या जानता है', 'याद रखी गई क्वेरी', 'एक्सटेंशन खतरनाक अनुमतियाँ माँग रहा है',
      'फिर भी इंस्टॉल करें', 'एक्सटेंशन की जाँच नहीं हो सकी:', 'यह एक्सटेंशन पहले से जोड़ा गया है',
      'एक्सटेंशन इंस्टॉल हो गया', 'इंस्टॉल नहीं हो सका:', 'सूची उपलब्ध नहीं है',
      'ब्राउज़र मेमोरी चालू करें?', 'पूरी मेमोरी मिटाएँ?', 'मेमोरी मिटा दी गई', 'पृष्ठ',
      'बना रहा है…', 'पृ.,', 'बनाएँ', 'हटाया गया:', 'आयात किया गया:'
    ],
    en: [
      'Night — quiet and quick decisions.', 'Good morning — start with one important task.',
      'Day at work — stay focused and find answers fast.', 'Evening — time for calm tabs and clear thinking.',
      'Import', 'Custom CSS', 'Automation', 'Personal context', 'New web panel', 'Format: Ctrl+Shift+X',
      'Bottom', 'Right', 'Address bar', 'Top or bottom', 'Balance, focus, or creativity',
      'Balance', 'Focus', 'Creativity', 'Start-page greeting', 'Change greetings by time of day',
      'Denser layout with fewer distractions', 'Quick actions', 'Panel with private tab and settings',
      'Free Google AI Studio key (aistudio.google.com → Get API key): the model reads text from screenshots, CAPTCHAs, and charts. When a key is entered, screenshots are sent to Google; without a key, screenshots stay on this device.',
      'Groq fallback', 'No keys', 'Local OCR recognizes text on this device, without internet or registration.',
      'Drop a file here', 'Drag a downloaded .crx or .zip from the extension store into this area',
      'Filter', 'By name, version, path, or load error', 'Result', 'List', 'Detected repeats',
      'What AI knows', 'Remembered queries', 'This extension requests sensitive permissions',
      'Install anyway', 'Could not check the extension:', 'This extension has already been added',
      'Extension installed', 'Could not install:', 'List unavailable',
      'Enable browser memory?', 'Delete ALL memory?', 'Memory erased', 'pages',
      'Building…', 'pg.,', 'Build', 'Deleted:', 'Imported:'
    ],
    de: [
      'Nacht — Ruhe und schnelle Entscheidungen.', 'Guten Morgen — beginne mit einer wichtigen Aufgabe.',
      'Arbeitstag — bleib konzentriert und finde schnell Antworten.', 'Abend — Zeit für ruhige Tabs und klare Gedanken.',
      'Import', 'Eigenes CSS', 'Automatisierung', 'Persönlicher Kontext', 'Neues Webpanel', 'Format: Ctrl+Shift+X',
      'Unten', 'Rechts', 'Adressleiste', 'Oben oder unten', 'Balance, Fokus oder Kreativität',
      'Balance', 'Fokus', 'Kreativität', 'Begrüßung auf der Startseite', 'Begrüßung je nach Tageszeit ändern',
      'Kompakter mit weniger überflüssigen Bereichen', 'Schnellaktionen', 'Panel mit privatem Tab und Einstellungen',
      'Kostenloser Google-AI-Studio-Schlüssel (aistudio.google.com → Get API key): Das Modell liest Text aus Screenshots, CAPTCHAs und Diagrammen. Mit eingetragenem Schlüssel werden Screenshots an Google gesendet; ohne Schlüssel bleiben sie auf diesem Gerät.',
      'Groq als Ersatz', 'Keine Schlüssel', 'Lokale OCR erkennt Text auf diesem Gerät – ohne Internet und Registrierung.',
      'Datei hier ablegen', 'Ziehe eine aus dem Erweiterungs-Store geladene .crx- oder .zip-Datei hierher',
      'Filter', 'Nach Name, Version, Pfad oder Ladefehler', 'Ergebnis', 'Liste', 'Erkannte Wiederholungen',
      'Was die KI weiß', 'Gespeicherte Anfragen', 'Diese Erweiterung fordert gefährliche Berechtigungen an',
      'Trotzdem installieren', 'Erweiterung konnte nicht geprüft werden:', 'Diese Erweiterung wurde bereits hinzugefügt',
      'Erweiterung installiert', 'Installation fehlgeschlagen:', 'Liste nicht verfügbar',
      'Browserspeicher aktivieren?', 'Den GESAMTEN Speicher löschen?', 'Speicher gelöscht', 'Seiten',
      'Wird erstellt…', 'S.,', 'Erstellen', 'Gelöscht:', 'Importiert:'
    ],
    fr: [
      'Nuit — calme et décisions rapides.', 'Bonjour — commencez par une tâche importante.',
      'Journée de travail — restez concentré et trouvez vite des réponses.', 'Soir — le moment des onglets calmes et des idées claires.',
      'Importer', 'CSS personnalisé', 'Automatisation', 'Contexte personnel', 'Nouveau panneau Web', 'Format : Ctrl+Shift+X',
      'En bas', 'À droite', 'Barre d’adresse', 'En haut ou en bas', 'Équilibre, concentration ou créativité',
      'Équilibre', 'Concentration', 'Créativité', 'Salutation de la page d’accueil', 'Changer les salutations selon l’heure',
      'Disposition plus dense et moins d’éléments superflus', 'Actions rapides', 'Panneau avec onglet privé et paramètres',
      'Clé gratuite Google AI Studio (aistudio.google.com → Get API key) : le modèle lit le texte des captures d’écran, des CAPTCHA et des graphiques. Avec une clé, les captures sont envoyées à Google ; sans clé, elles restent sur cet appareil.',
      'Groq en secours', 'Sans clé', 'L’OCR local reconnaît le texte sur cet appareil, sans Internet ni inscription.',
      'Déposez un fichier ici', 'Glissez ici un fichier .crx ou .zip téléchargé depuis le magasin d’extensions',
      'Filtrer', 'Par nom, version, chemin ou erreur de chargement', 'Résultat', 'Liste', 'Répétitions détectées',
      'Ce que l’IA sait', 'Requêtes mémorisées', 'Cette extension demande des autorisations sensibles',
      'Installer quand même', 'Impossible de vérifier l’extension :', 'Cette extension a déjà été ajoutée',
      'Extension installée', 'Installation impossible :', 'Liste indisponible',
      'Activer la mémoire du navigateur ?', 'Effacer TOUTE la mémoire ?', 'Mémoire effacée', 'pages',
      'Création…', 'p.,', 'Créer', 'Supprimé :', 'Importé :'
    ],
    es: [
      'Noche: calma y decisiones rápidas.', 'Buenos días: empieza por una tarea importante.',
      'Día de trabajo: mantén la concentración y encuentra respuestas rápido.', 'Tarde: tiempo para pestañas tranquilas y pensamientos claros.',
      'Importar', 'CSS personalizado', 'Automatización', 'Contexto personal', 'Nuevo panel web', 'Formato: Ctrl+Shift+X',
      'Abajo', 'A la derecha', 'Barra de direcciones', 'Arriba o abajo', 'Equilibrio, concentración o creatividad',
      'Equilibrio', 'Concentración', 'Creatividad', 'Saludo de la página de inicio', 'Cambiar saludos según la hora',
      'Diseño más compacto y con menos elementos innecesarios', 'Acciones rápidas', 'Panel con pestaña privada y ajustes',
      'Clave gratuita de Google AI Studio (aistudio.google.com → Get API key): el modelo lee texto de capturas, CAPTCHA y gráficos. Si se introduce una clave, las capturas se envían a Google; sin clave, permanecen en este dispositivo.',
      'Groq como alternativa', 'Sin claves', 'El OCR local reconoce texto en este dispositivo, sin Internet ni registro.',
      'Suelta un archivo aquí', 'Arrastra aquí un archivo .crx o .zip descargado de la tienda de extensiones',
      'Filtro', 'Por nombre, versión, ruta o error de carga', 'Resultado', 'Lista', 'Repeticiones detectadas',
      'Qué sabe la IA', 'Consultas recordadas', 'Esta extensión solicita permisos sensibles',
      'Instalar de todos modos', 'No se pudo comprobar la extensión:', 'Esta extensión ya está añadida',
      'Extensión instalada', 'No se pudo instalar:', 'Lista no disponible',
      '¿Activar la memoria del navegador?', '¿Borrar TODA la memoria?', 'Memoria borrada', 'páginas',
      'Creando…', 'pág.,', 'Crear', 'Eliminado:', 'Importado:'
    ],
    it: [
      'Notte — calma e decisioni rapide.', 'Buongiorno — inizia da un’attività importante.',
      'Giornata di lavoro — mantieni la concentrazione e trova subito le risposte.', 'Sera — il momento delle schede tranquille e dei pensieri chiari.',
      'Importa', 'CSS personalizzato', 'Automazione', 'Contesto personale', 'Nuovo pannello web', 'Formato: Ctrl+Shift+X',
      'In basso', 'A destra', 'Barra degli indirizzi', 'In alto o in basso', 'Equilibrio, concentrazione o creatività',
      'Equilibrio', 'Concentrazione', 'Creatività', 'Saluto nella pagina iniziale', 'Cambia saluto in base all’ora',
      'Layout più compatto e meno elementi superflui', 'Azioni rapide', 'Pannello con scheda privata e impostazioni',
      'Chiave gratuita Google AI Studio (aistudio.google.com → Get API key): il modello legge il testo da schermate, CAPTCHA e grafici. Con una chiave, le schermate vengono inviate a Google; senza chiave restano su questo dispositivo.',
      'Groq di riserva', 'Senza chiavi', 'L’OCR locale riconosce il testo su questo dispositivo, senza Internet né registrazione.',
      'Trascina qui un file', 'Trascina qui un file .crx o .zip scaricato dallo store delle estensioni',
      'Filtro', 'Per nome, versione, percorso o errore di caricamento', 'Risultato', 'Elenco', 'Ripetizioni rilevate',
      'Cosa sa l’IA', 'Richieste memorizzate', 'Questa estensione richiede autorizzazioni sensibili',
      'Installa comunque', 'Impossibile verificare l’estensione:', 'Questa estensione è già stata aggiunta',
      'Estensione installata', 'Impossibile installare:', 'Elenco non disponibile',
      'Attivare la memoria del browser?', 'Eliminare TUTTA la memoria?', 'Memoria cancellata', 'pagine',
      'Creazione…', 'pag.,', 'Crea', 'Eliminato:', 'Importato:'
    ],
    pt: [
      'Noite — tranquilidade e decisões rápidas.', 'Bom dia — comece por uma tarefa importante.',
      'Dia de trabalho — mantenha o foco e encontre respostas rapidamente.', 'Noite — hora de separadores tranquilos e pensamentos claros.',
      'Importar', 'CSS personalizado', 'Automação', 'Contexto pessoal', 'Novo painel web', 'Formato: Ctrl+Shift+X',
      'Em baixo', 'À direita', 'Barra de endereço', 'Em cima ou em baixo', 'Equilíbrio, foco ou criatividade',
      'Equilíbrio', 'Foco', 'Criatividade', 'Saudação na página inicial', 'Alterar saudações conforme a hora',
      'Mais compacto e com menos elementos desnecessários', 'Ações rápidas', 'Painel com separador privado e definições',
      'Chave gratuita do Google AI Studio (aistudio.google.com → Get API key): o modelo lê texto de capturas de ecrã, CAPTCHA e gráficos. Com uma chave, as capturas são enviadas à Google; sem chave, permanecem neste dispositivo.',
      'Groq de reserva', 'Sem chaves', 'O OCR local reconhece texto neste dispositivo, sem Internet nem registo.',
      'Largue um ficheiro aqui', 'Arraste para esta área um ficheiro .crx ou .zip descarregado da loja de extensões',
      'Filtro', 'Por nome, versão, caminho ou erro de carregamento', 'Resultado', 'Lista', 'Repetições encontradas',
      'O que a IA sabe', 'Pedidos memorizados', 'Esta extensão solicita permissões sensíveis',
      'Instalar mesmo assim', 'Não foi possível verificar a extensão:', 'Esta extensão já foi adicionada',
      'Extensão instalada', 'Não foi possível instalar:', 'Lista indisponível',
      'Ativar a memória do navegador?', 'Apagar TODA a memória?', 'Memória apagada', 'páginas',
      'A criar…', 'pág.,', 'Criar', 'Eliminado:', 'Importado:'
    ],
    pl: [
      'Noc — spokój i szybkie decyzje.', 'Dzień dobry — zacznij od jednego ważnego zadania.',
      'Dzień pracy — zachowaj skupienie i szybko znajduj odpowiedzi.', 'Wieczór — czas na spokojne karty i jasne myśli.',
      'Import', 'Własny CSS', 'Automatyzacja', 'Kontekst osobisty', 'Nowy panel WWW', 'Format: Ctrl+Shift+X',
      'Na dole', 'Po prawej', 'Pasek adresu', 'U góry lub na dole', 'Równowaga, skupienie lub kreatywność',
      'Równowaga', 'Skupienie', 'Kreatywność', 'Powitanie na stronie startowej', 'Zmieniaj powitanie zależnie od pory dnia',
      'Bardziej zwarty układ i mniej zbędnych elementów', 'Szybkie działania', 'Panel z kartą prywatną i ustawieniami',
      'Bezpłatny klucz Google AI Studio (aistudio.google.com → Get API key): model odczytuje tekst ze zrzutów ekranu, CAPTCHA i wykresów. Po wpisaniu klucza zrzuty są wysyłane do Google; bez klucza pozostają na tym urządzeniu.',
      'Awaryjny Groq', 'Bez kluczy', 'Lokalny OCR rozpoznaje tekst na tym urządzeniu, bez Internetu i rejestracji.',
      'Upuść plik tutaj', 'Przeciągnij tutaj pobrany ze sklepu rozszerzeń plik .crx lub .zip',
      'Filtr', 'Według nazwy, wersji, ścieżki lub błędu ładowania', 'Wynik', 'Lista', 'Wykryte powtórzenia',
      'Co wie AI', 'Zapamiętane zapytania', 'To rozszerzenie prosi o niebezpieczne uprawnienia',
      'Zainstaluj mimo to', 'Nie udało się sprawdzić rozszerzenia:', 'To rozszerzenie zostało już dodane',
      'Rozszerzenie zainstalowane', 'Nie udało się zainstalować:', 'Lista niedostępna',
      'Włączyć pamięć przeglądarki?', 'Usunąć CAŁĄ pamięć?', 'Pamięć wyczyszczona', 'stron',
      'Tworzenie…', 'str.,', 'Utwórz', 'Usunięto:', 'Zaimportowano:'
    ],
    tr: [
      'Gece — sakinlik ve hızlı kararlar.', 'Günaydın — önemli bir işle başlayın.',
      'İş günü — odağınızı koruyun ve yanıtları hızla bulun.', 'Akşam — sakin sekmeler ve berrak düşünceler zamanı.',
      'İçe aktar', 'Özel CSS', 'Otomasyon', 'Kişisel bağlam', 'Yeni web paneli', 'Biçim: Ctrl+Shift+X',
      'Altta', 'Sağda', 'Adres çubuğu', 'Üstte veya altta', 'Denge, odak veya yaratıcılık',
      'Denge', 'Odak', 'Yaratıcılık', 'Başlangıç sayfası selamlaması', 'Selamlamaları günün saatine göre değiştir',
      'Daha sıkı düzen, daha az gereksiz bölüm', 'Hızlı işlemler', 'Gizli sekme ve ayarların bulunduğu panel',
      'Ücretsiz Google AI Studio anahtarı (aistudio.google.com → Get API key): model ekran görüntülerindeki, CAPTCHA’lardaki ve grafiklerdeki metni okur. Anahtar girildiğinde ekran görüntüleri Google’a gönderilir; anahtar yoksa cihazdan çıkmaz.',
      'Yedek Groq', 'Anahtarsız', 'Yerel OCR metni bu cihazda, internet veya kayıt olmadan tanır.',
      'Dosyayı buraya bırakın', 'Uzantı mağazasından indirdiğiniz .crx veya .zip dosyasını bu alana sürükleyin',
      'Filtre', 'Ada, sürüme, yola veya yükleme hatasına göre', 'Sonuç', 'Liste', 'Bulunan tekrarlar',
      'Yapay zekâ neleri biliyor', 'Hatırlanan sorgular', 'Bu uzantı hassas izinler istiyor',
      'Yine de yükle', 'Uzantı denetlenemedi:', 'Bu uzantı zaten eklendi',
      'Uzantı yüklendi', 'Yüklenemedi:', 'Liste kullanılamıyor',
      'Tarayıcı belleği etkinleştirilsin mi?', 'TÜM bellek silinsin mi?', 'Bellek silindi', 'sayfa',
      'Oluşturuluyor…', 'sf.,', 'Oluştur', 'Silindi:', 'İçe aktarıldı:'
    ],
    nl: [
      'Nacht — rust en snelle beslissingen.', 'Goedemorgen — begin met één belangrijke taak.',
      'Werkdag — blijf gefocust en vind snel antwoorden.', 'Avond — tijd voor rustige tabbladen en heldere gedachten.',
      'Importeren', 'Aangepaste CSS', 'Automatisering', 'Persoonlijke context', 'Nieuw webpaneel', 'Formaat: Ctrl+Shift+X',
      'Onder', 'Rechts', 'Adresbalk', 'Boven of onder', 'Balans, focus of creativiteit',
      'Balans', 'Focus', 'Creativiteit', 'Begroeting op startpagina', 'Begroetingen aanpassen aan het tijdstip',
      'Compacter met minder overbodige onderdelen', 'Snelle acties', 'Paneel met privétabblad en instellingen',
      'Gratis Google AI Studio-sleutel (aistudio.google.com → Get API key): het model leest tekst uit schermafbeeldingen, CAPTCHA’s en grafieken. Met een sleutel worden schermafbeeldingen naar Google gestuurd; zonder sleutel blijven ze op dit apparaat.',
      'Groq als reserve', 'Geen sleutels', 'Lokale OCR herkent tekst op dit apparaat, zonder internet of registratie.',
      'Sleep een bestand hierheen', 'Sleep een gedownload .crx- of .zip-bestand uit de extensiewinkel naar dit gebied',
      'Filter', 'Op naam, versie, pad of laadfout', 'Resultaat', 'Lijst', 'Gevonden herhalingen',
      'Wat AI weet', 'Onthouden zoekopdrachten', 'Deze extensie vraagt om gevoelige machtigingen',
      'Toch installeren', 'Extensie kan niet worden gecontroleerd:', 'Deze extensie is al toegevoegd',
      'Extensie geïnstalleerd', 'Installeren mislukt:', 'Lijst niet beschikbaar',
      'Browsergeheugen inschakelen?', 'ALLE geheugen wissen?', 'Geheugen gewist', 'pagina’s',
      'Bezig met opbouwen…', 'pag.,', 'Opbouwen', 'Verwijderd:', 'Geïmporteerd:'
    ],
    sv: [
      'Natt — lugn och snabba beslut.', 'God morgon — börja med en viktig uppgift.',
      'Arbetsdag — håll fokus och hitta svar snabbt.', 'Kväll — dags för lugna flikar och klara tankar.',
      'Importera', 'Egen CSS', 'Automatisering', 'Personlig kontext', 'Ny webbpanel', 'Format: Ctrl+Shift+X',
      'Nederst', 'Till höger', 'Adressfält', 'Överst eller nederst', 'Balans, fokus eller kreativitet',
      'Balans', 'Fokus', 'Kreativitet', 'Hälsning på startsidan', 'Ändra hälsning efter tid på dagen',
      'Kompaktare med färre onödiga delar', 'Snabbåtgärder', 'Panel med privat flik och inställningar',
      'Kostnadsfri Google AI Studio-nyckel (aistudio.google.com → Get API key): modellen läser text från skärmbilder, CAPTCHA och diagram. Med en nyckel skickas skärmbilder till Google; utan nyckel lämnar de inte enheten.',
      'Groq som reserv', 'Utan nycklar', 'Lokal OCR känner igen text på enheten, utan internet eller registrering.',
      'Släpp en fil här', 'Dra en nedladdad .crx- eller .zip-fil från tilläggsbutiken till området',
      'Filter', 'Efter namn, version, sökväg eller inläsningsfel', 'Resultat', 'Lista', 'Hittade upprepningar',
      'Vad AI vet', 'Ihågkomna frågor', 'Det här tillägget begär känsliga behörigheter',
      'Installera ändå', 'Det gick inte att kontrollera tillägget:', 'Det här tillägget har redan lagts till',
      'Tillägget installerades', 'Det gick inte att installera:', 'Listan är inte tillgänglig',
      'Aktivera webbläsarminne?', 'Radera ALLT minne?', 'Minnet har raderats', 'sidor',
      'Skapar…', 'sid.,', 'Skapa', 'Borttaget:', 'Importerat:'
    ],
    fi: [
      'Yö — rauhaa ja nopeita päätöksiä.', 'Hyvää huomenta — aloita yhdestä tärkeästä tehtävästä.',
      'Työpäivä — keskity ja löydä vastaukset nopeasti.', 'Ilta — rauhallisten välilehtien ja kirkkaiden ajatusten aikaa.',
      'Tuo', 'Oma CSS', 'Automaatio', 'Henkilökohtainen konteksti', 'Uusi verkkopaneeli', 'Muoto: Ctrl+Shift+X',
      'Alhaalla', 'Oikealla', 'Osoiterivi', 'Ylhäällä tai alhaalla', 'Tasapaino, keskittyminen tai luovuus',
      'Tasapaino', 'Keskittyminen', 'Luovuus', 'Aloitussivun tervehdys', 'Vaihda tervehdystä vuorokaudenajan mukaan',
      'Tiiviimpi asettelu ja vähemmän turhia osioita', 'Pikatoiminnot', 'Paneeli, jossa on yksityinen välilehti ja asetukset',
      'Maksuton Google AI Studio -avain (aistudio.google.com → Get API key): malli lukee tekstiä kuvakaappauksista, CAPTCHA-kuvista ja kaavioista. Avaimella kuvakaappaukset lähetetään Googlelle; ilman avainta ne pysyvät tällä laitteella.',
      'Varalla Groq', 'Ei avaimia', 'Paikallinen OCR tunnistaa tekstin tällä laitteella ilman internetiä tai rekisteröitymistä.',
      'Pudota tiedosto tähän', 'Vedä laajennuskaupasta ladattu .crx- tai .zip-tiedosto tähän alueeseen',
      'Suodatin', 'Nimen, version, polun tai latausvirheen mukaan', 'Tulos', 'Luettelo', 'Löydetyt toistot',
      'Mitä tekoäly tietää', 'Muistetut haut', 'Tämä laajennus pyytää arkaluonteisia käyttöoikeuksia',
      'Asenna silti', 'Laajennuksen tarkistus epäonnistui:', 'Tämä laajennus on jo lisätty',
      'Laajennus asennettu', 'Asennus epäonnistui:', 'Luettelo ei ole käytettävissä',
      'Otetaanko selaimen muisti käyttöön?', 'Poistetaanko KAIKKI muisti?', 'Muisti tyhjennetty', 'sivua',
      'Luodaan…', 'siv.,', 'Luo', 'Poistettu:', 'Tuotu:'
    ],
    cs: [
      'Noc — klid a rychlá rozhodnutí.', 'Dobré ráno — začněte jedním důležitým úkolem.',
      'Pracovní den — soustřeďte se a rychle najděte odpovědi.', 'Večer — čas na klidné panely a jasné myšlenky.',
      'Import', 'Vlastní CSS', 'Automatizace', 'Osobní kontext', 'Nový webový panel', 'Formát: Ctrl+Shift+X',
      'Dole', 'Vpravo', 'Adresní řádek', 'Nahoře nebo dole', 'Rovnováha, soustředění nebo kreativita',
      'Rovnováha', 'Soustředění', 'Kreativita', 'Pozdrav na úvodní stránce', 'Měnit pozdravy podle denní doby',
      'Kompaktnější rozvržení s méně zbytečnými prvky', 'Rychlé akce', 'Panel se soukromou kartou a nastavením',
      'Bezplatný klíč Google AI Studio (aistudio.google.com → Get API key): model čte text ze snímků obrazovky, CAPTCHA a grafů. S vyplněným klíčem se snímky odesílají Googlu; bez klíče zůstávají v tomto zařízení.',
      'Záložní Groq', 'Bez klíčů', 'Místní OCR rozpoznává text v tomto zařízení bez internetu a registrace.',
      'Přetáhněte sem soubor', 'Přetáhněte sem stažený soubor .crx nebo .zip z obchodu s rozšířeními',
      'Filtr', 'Podle názvu, verze, cesty nebo chyby načtení', 'Výsledek', 'Seznam', 'Nalezená opakování',
      'Co AI ví', 'Zapamatované dotazy', 'Toto rozšíření požaduje citlivá oprávnění',
      'Přesto nainstalovat', 'Rozšíření se nepodařilo zkontrolovat:', 'Toto rozšíření už bylo přidáno',
      'Rozšíření nainstalováno', 'Instalace se nezdařila:', 'Seznam není dostupný',
      'Zapnout paměť prohlížeče?', 'Smazat VEŠKEROU paměť?', 'Paměť byla vymazána', 'stránek',
      'Vytváření…', 'str.,', 'Vytvořit', 'Odstraněno:', 'Importováno:'
    ],
    ro: [
      'Noapte — liniște și decizii rapide.', 'Bună dimineața — începe cu o sarcină importantă.',
      'Zi de lucru — păstrează concentrarea și găsește rapid răspunsuri.', 'Seară — vremea filelor liniștite și a gândurilor clare.',
      'Importă', 'CSS personalizat', 'Automatizare', 'Context personal', 'Panou web nou', 'Format: Ctrl+Shift+X',
      'Jos', 'La dreapta', 'Bara de adrese', 'Sus sau jos', 'Echilibru, concentrare sau creativitate',
      'Echilibru', 'Concentrare', 'Creativitate', 'Salut pe pagina de pornire', 'Schimbă salutul în funcție de oră',
      'Aspect mai compact, cu mai puține secțiuni inutile', 'Acțiuni rapide', 'Panou cu filă privată și setări',
      'Cheie gratuită Google AI Studio (aistudio.google.com → Get API key): modelul citește text din capturi de ecran, CAPTCHA și grafice. Cu o cheie, capturile sunt trimise la Google; fără cheie, rămân pe acest dispozitiv.',
      'Groq de rezervă', 'Fără chei', 'OCR-ul local recunoaște textul pe acest dispozitiv, fără internet sau înregistrare.',
      'Trage un fișier aici', 'Trage aici un fișier .crx sau .zip descărcat din magazinul de extensii',
      'Filtru', 'După nume, versiune, cale sau eroare de încărcare', 'Rezultat', 'Listă', 'Repetări detectate',
      'Ce știe IA', 'Interogări memorate', 'Această extensie solicită permisiuni sensibile',
      'Instalează oricum', 'Extensia nu a putut fi verificată:', 'Această extensie a fost deja adăugată',
      'Extensie instalată', 'Instalarea a eșuat:', 'Lista nu este disponibilă',
      'Activezi memoria browserului?', 'Ștergi TOATĂ memoria?', 'Memoria a fost ștearsă', 'pagini',
      'Se construiește…', 'pag.,', 'Construiește', 'Șters:', 'Importat:'
    ],
    el: [
      'Νύχτα — ηρεμία και γρήγορες αποφάσεις.', 'Καλημέρα — ξεκινήστε με μία σημαντική εργασία.',
      'Ημέρα εργασίας — μείνετε συγκεντρωμένοι και βρείτε γρήγορα απαντήσεις.', 'Βράδυ — ώρα για ήρεμες καρτέλες και καθαρή σκέψη.',
      'Εισαγωγή', 'Προσαρμοσμένο CSS', 'Αυτοματισμός', 'Προσωπικό πλαίσιο', 'Νέο πλαίσιο ιστού', 'Μορφή: Ctrl+Shift+X',
      'Κάτω', 'Δεξιά', 'Γραμμή διεύθυνσης', 'Πάνω ή κάτω', 'Ισορροπία, συγκέντρωση ή δημιουργικότητα',
      'Ισορροπία', 'Συγκέντρωση', 'Δημιουργικότητα', 'Χαιρετισμός αρχικής σελίδας', 'Αλλαγή χαιρετισμού ανάλογα με την ώρα',
      'Πιο συμπαγής διάταξη με λιγότερα περιττά στοιχεία', 'Γρήγορες ενέργειες', 'Πλαίσιο με ιδιωτική καρτέλα και ρυθμίσεις',
      'Δωρεάν κλειδί Google AI Studio (aistudio.google.com → Get API key): το μοντέλο διαβάζει κείμενο από στιγμιότυπα οθόνης, CAPTCHA και γραφήματα. Με κλειδί, τα στιγμιότυπα αποστέλλονται στην Google· χωρίς κλειδί, μένουν σε αυτή τη συσκευή.',
      'Εφεδρικό Groq', 'Χωρίς κλειδιά', 'Το τοπικό OCR αναγνωρίζει κείμενο σε αυτή τη συσκευή, χωρίς διαδίκτυο ή εγγραφή.',
      'Αποθέστε ένα αρχείο εδώ', 'Σύρετε εδώ ένα αρχείο .crx ή .zip που κατεβάσατε από το κατάστημα επεκτάσεων',
      'Φίλτρο', 'Με βάση όνομα, έκδοση, διαδρομή ή σφάλμα φόρτωσης', 'Αποτέλεσμα', 'Λίστα', 'Εντοπισμένες επαναλήψεις',
      'Τι γνωρίζει η ΤΝ', 'Αποθηκευμένα ερωτήματα', 'Αυτή η επέκταση ζητά ευαίσθητα δικαιώματα',
      'Εγκατάσταση ούτως ή άλλως', 'Δεν ήταν δυνατός ο έλεγχος της επέκτασης:', 'Αυτή η επέκταση έχει ήδη προστεθεί',
      'Η επέκταση εγκαταστάθηκε', 'Δεν ήταν δυνατή η εγκατάσταση:', 'Η λίστα δεν είναι διαθέσιμη',
      'Ενεργοποίηση μνήμης προγράμματος περιήγησης;', 'Διαγραφή ΟΛΗΣ της μνήμης;', 'Η μνήμη διαγράφηκε', 'σελίδες',
      'Δημιουργία…', 'σελ.,', 'Δημιουργία', 'Διαγράφηκε:', 'Εισήχθησαν:'
    ],
    be: [
      'Ноч — цішыня і хуткія рашэнні.', 'Добрай раніцы — пачніце з адной важнай справы.',
      'Працоўны дзень — захоўвайце канцэнтрацыю і хутка знаходзьце адказы.', 'Вечар — час спакойных укладак і ясных думак.',
      'Імпарт', 'Уласны CSS', 'Аўтаматызацыя', 'Асабісты кантэкст', 'Новая вэб-панэль', 'Фармат: Ctrl+Shift+X',
      'Знізу', 'Справа', 'Адрасны радок', 'Зверху або знізу', 'Баланс, фокус або творчасць',
      'Баланс', 'Фокус', 'Творчасць', 'Вітанне на стартавай старонцы', 'Змена вітання ў залежнасці ад часу сутак',
      'Больш шчыльнае размяшчэнне і менш лішніх блокаў', 'Хуткія дзеянні', 'Панэль з прыватнай укладкай і наладамі',
      'Бясплатны ключ Google AI Studio (aistudio.google.com → Get API key): мадэль чытае тэкст са здымкаў экрана, капч і графікаў. Калі ключ запоўнены, здымкі адпраўляюцца ў Google; без ключа яны не пакідаюць прыладу.',
      'Рэзервовы Groq', 'Без ключоў', 'Лакальны OCR распазнае тэкст на прыладзе без інтэрнэту і рэгістрацыі.',
      'Перацягніце файл сюды', 'Перацягніце сюды спампаваны з крамы пашырэнняў файл .crx або .zip',
      'Фільтр', 'Па назве, версіі, шляху або памылцы загрузкі', 'Вынік', 'Спіс', 'Знойдзеныя паўторы',
      'Што ведае ШІ', 'Запомненыя запыты', 'Гэтае пашырэнне запытвае небяспечныя дазволы',
      'Усё роўна ўсталяваць', 'Не ўдалося праверыць пашырэнне:', 'Гэтае пашырэнне ўжо дададзена',
      'Пашырэнне ўсталявана', 'Не ўдалося ўсталяваць:', 'Спіс недаступны',
      'Уключыць памяць браўзера?', 'Выдаліць УСЮ памяць?', 'Памяць сцёрта', 'старонак',
      'Стварэнне…', 'стар.,', 'Стварыць', 'Выдалена:', 'Імпартавана:'
    ],
    kk: [
      'Түн — тыныштық пен жылдам шешімдер.', 'Қайырлы таң — маңызды бір істен бастаңыз.',
      'Жұмыс күні — зейінді сақтап, жауаптарды тез табыңыз.', 'Кеш — тыныш қойындылар мен анық ойлар уақыты.',
      'Импорттау', 'Өз CSS-і', 'Автоматтандыру', 'Жеке контекст', 'Жаңа веб-панель', 'Пішімі: Ctrl+Shift+X',
      'Төменде', 'Оң жақта', 'Мекенжай жолағы', 'Жоғарыда немесе төменде', 'Теңгерім, зейін немесе шығармашылық',
      'Теңгерім', 'Зейін', 'Шығармашылық', 'Бастапқы беттегі сәлемдесу', 'Сәлемдесуді тәулік уақытына қарай өзгерту',
      'Ықшамырақ, қажетсіз бөлімдері аз', 'Жылдам әрекеттер', 'Жеке қойынды мен баптаулары бар панель',
      'Google AI Studio тегін кілті (aistudio.google.com → Get API key): модель скриншоттардан, CAPTCHA және графиктерден мәтінді оқиды. Кілт енгізілсе, скриншоттар Google-ға жіберіледі; кілт болмаса, құрылғыдан шықпайды.',
      'Қосалқы Groq', 'Кілтсіз', 'Жергілікті OCR мәтінді интернетсіз және тіркелусіз осы құрылғыда таниды.',
      'Файлды осында сүйреп әкеліңіз', 'Кеңейтімдер дүкенінен жүктелген .crx немесе .zip файлын осы жерге сүйреп әкеліңіз',
      'Сүзгі', 'Атауы, нұсқасы, жолы немесе жүктеу қатесі бойынша', 'Нәтиже', 'Тізім', 'Табылған қайталанулар',
      'ЖИ не біледі', 'Есте сақталған сұраулар', 'Бұл кеңейтім қауіпті рұқсаттарды сұрайды',
      'Сонда да орнату', 'Кеңейтімді тексеру мүмкін болмады:', 'Бұл кеңейтім әлдеқашан қосылған',
      'Кеңейтім орнатылды', 'Орнату мүмкін болмады:', 'Тізім қолжетімсіз',
      'Браузер жадын қосу керек пе?', 'БАРЛЫҚ жадты жою керек пе?', 'Жад өшірілді', 'бет',
      'Құрылуда…', 'бет.,', 'Құру', 'Жойылды:', 'Импортталды:'
    ],
    ar: [
      'الليل — هدوء وقرارات سريعة.', 'صباح الخير — ابدأ بمهمة مهمة واحدة.',
      'يوم العمل — حافظ على تركيزك واعثر على الإجابات بسرعة.', 'المساء — وقت علامات التبويب الهادئة والأفكار الواضحة.',
      'استيراد', 'CSS مخصص', 'الأتمتة', 'السياق الشخصي', 'لوحة ويب جديدة', 'التنسيق: Ctrl+Shift+X',
      'أسفل', 'يمينًا', 'شريط العنوان', 'أعلى أو أسفل', 'توازن أو تركيز أو إبداع',
      'توازن', 'تركيز', 'إبداع', 'تحية صفحة البداية', 'تغيير التحية حسب وقت اليوم',
      'تخطيط أكثر إحكامًا وأقسام غير ضرورية أقل', 'إجراءات سريعة', 'لوحة تضم علامة تبويب خاصة والإعدادات',
      'مفتاح Google AI Studio مجاني (aistudio.google.com → Get API key): يقرأ النموذج النص من لقطات الشاشة واختبارات CAPTCHA والرسوم البيانية. عند إدخال المفتاح تُرسل اللقطات إلى Google؛ ومن دونه تبقى على هذا الجهاز.',
      'Groq احتياطي', 'بلا مفاتيح', 'يتعرف OCR المحلي على النص على هذا الجهاز، دون إنترنت أو تسجيل.',
      'أفلت ملفًا هنا', 'اسحب إلى هذه المنطقة ملف .crx أو .zip تم تنزيله من متجر الإضافات',
      'تصفية', 'حسب الاسم أو الإصدار أو المسار أو خطأ التحميل', 'النتيجة', 'القائمة', 'التكرارات المكتشفة',
      'ما الذي يعرفه الذكاء الاصطناعي', 'الطلبات التي تم تذكرها', 'تطلب هذه الإضافة أذونات حساسة',
      'التثبيت على أي حال', 'تعذر التحقق من الإضافة:', 'تمت إضافة هذه الإضافة مسبقًا',
      'تم تثبيت الإضافة', 'تعذر التثبيت:', 'القائمة غير متاحة',
      'هل تريد تفعيل ذاكرة المتصفح؟', 'هل تريد حذف الذاكرة كلها؟', 'تم مسح الذاكرة', 'صفحات',
      'جارٍ الإنشاء…', 'ص.،', 'إنشاء', 'تم الحذف:', 'تم الاستيراد:'
    ],
    he: [
      'לילה — שקט והחלטות מהירות.', 'בוקר טוב — התחילו במשימה חשובה אחת.',
      'יום עבודה — שמרו על מיקוד ומצאו תשובות במהירות.', 'ערב — זמן לכרטיסיות שקטות ולמחשבות צלולות.',
      'ייבוא', 'CSS מותאם אישית', 'אוטומציה', 'הקשר אישי', 'לוח אינטרנט חדש', 'פורמט: Ctrl+Shift+X',
      'למטה', 'מימין', 'שורת הכתובת', 'למעלה או למטה', 'איזון, מיקוד או יצירתיות',
      'איזון', 'מיקוד', 'יצירתיות', 'ברכת דף הפתיחה', 'שינוי הברכה לפי השעה ביום',
      'פריסה צפופה יותר עם פחות חלקים מיותרים', 'פעולות מהירות', 'לוח עם כרטיסייה פרטית והגדרות',
      'מפתח חינמי של Google AI Studio (aistudio.google.com → Get API key): המודל קורא טקסט מצילומי מסך, CAPTCHA ותרשימים. עם מפתח, צילומי המסך נשלחים ל-Google; ללא מפתח הם נשארים במכשיר.',
      'Groq לגיבוי', 'ללא מפתחות', 'זיהוי OCR מקומי קורא טקסט במכשיר הזה, ללא אינטרנט או הרשמה.',
      'יש לשחרר קובץ כאן', 'יש לגרור לכאן קובץ .crx או .zip שהורד מחנות התוספים',
      'סינון', 'לפי שם, גרסה, נתיב או שגיאת טעינה', 'תוצאה', 'רשימה', 'חזרות שזוהו',
      'מה הבינה המלאכותית יודעת', 'שאילתות שנשמרו', 'התוסף הזה מבקש הרשאות רגישות',
      'התקנה בכל זאת', 'לא ניתן לבדוק את התוסף:', 'התוסף הזה כבר נוסף',
      'התוסף הותקן', 'ההתקנה נכשלה:', 'הרשימה אינה זמינה',
      'להפעיל את זיכרון הדפדפן?', 'למחוק את כל הזיכרון?', 'הזיכרון נמחק', 'דפים',
      'בונה…', 'עמ׳,', 'בנייה', 'נמחקו:', 'יובאו:'
    ],
    zh: [
      '夜晚——宁静并迅速决策。', '早上好——从一件重要的事开始。',
      '工作日——保持专注，快速找到答案。', '夜晚——适合打开安静的标签页、理清思路。',
      '导入', '自定义 CSS', '自动化', '个人上下文', '新建网页面板', '格式：Ctrl+Shift+X',
      '底部', '右侧', '地址栏', '顶部或底部', '平衡、专注或创造力',
      '平衡', '专注', '创造力', '新标签页问候语', '根据一天中的时间更换问候语',
      '布局更紧凑，减少多余区块', '快捷操作', '包含隐私标签页和设置的面板',
      '免费的 Google AI Studio 密钥（aistudio.google.com → Get API key）：模型可读取屏幕截图、验证码和图表中的文字。填写密钥后，截图会发送给 Google；不填写密钥时，截图不会离开此设备。',
      'Groq 备用服务', '无需密钥', '本地 OCR 可在此设备上识别文字，无需联网或注册。',
      '将文件拖到此处', '将从扩展商店下载的 .crx 或 .zip 文件拖到此区域',
      '筛选', '按名称、版本、路径或加载错误筛选', '结果', '列表', '检测到的重复项',
      'AI 了解的内容', '已记住的查询', '此扩展程序请求敏感权限',
      '仍要安装', '无法检查扩展程序：', '此扩展程序已添加',
      '扩展程序已安装', '安装失败：', '列表不可用',
      '启用浏览器记忆？', '删除全部记忆？', '记忆已清除', '页',
      '正在构建…', '页，', '构建', '已删除：', '已导入：'
    ],
    ja: [
      '夜 — 静けさと素早い判断。', 'おはようございます — 大切なことを一つ始めましょう。',
      '仕事の日 — 集中を保ち、すばやく答えを見つけましょう。', '夜 — 落ち着いたタブと思考の時間。',
      'インポート', 'カスタム CSS', '自動化', 'パーソナルコンテキスト', '新しい Web パネル', '形式: Ctrl+Shift+X',
      '下', '右', 'アドレスバー', '上または下', 'バランス、集中、創造性',
      'バランス', '集中', '創造性', 'スタートページの挨拶', '時間帯に応じて挨拶を変更',
      'よりコンパクトにして不要な項目を削減', 'クイックアクション', 'プライベートタブと設定のパネル',
      '無料の Google AI Studio キー（aistudio.google.com → Get API key）: モデルはスクリーンショット、CAPTCHA、グラフの文字を読み取ります。キーを入力すると画像は Google に送信され、未入力の場合はこのデバイスから送信されません。',
      '予備の Groq', 'キーなし', 'ローカル OCR はインターネットや登録なしで、このデバイス上の文字を認識します。',
      'ファイルをここにドロップ', '拡張機能ストアからダウンロードした .crx または .zip をここにドラッグします',
      'フィルター', '名前、バージョン、パス、読み込みエラーで絞り込み', '結果', '一覧', '検出された繰り返し',
      'AI が把握していること', '記憶された検索', 'この拡張機能は機密性の高い権限を要求しています',
      'それでもインストール', '拡張機能を確認できませんでした: ', 'この拡張機能はすでに追加されています',
      '拡張機能をインストールしました', 'インストールできませんでした: ', '一覧を利用できません',
      'ブラウザーのメモリーを有効にしますか？', 'すべてのメモリーを削除しますか？', 'メモリーを消去しました', 'ページ',
      '作成中…', 'ページ、', '作成', '削除済み: ', 'インポート済み:'
    ],
    ko: [
      '밤 — 차분하고 빠른 결정.', '좋은 아침입니다 — 중요한 일 하나부터 시작하세요.',
      '업무 시간 — 집중력을 유지하고 답을 빠르게 찾으세요.', '저녁 — 차분한 탭과 맑은 생각을 위한 시간.',
      '가져오기', '사용자 지정 CSS', '자동화', '개인 컨텍스트', '새 웹 패널', '형식: Ctrl+Shift+X',
      '아래쪽', '오른쪽', '주소 표시줄', '위쪽 또는 아래쪽', '균형, 집중 또는 창의성',
      '균형', '집중', '창의성', '새 탭 인사말', '시간대에 따라 인사말 변경',
      '더 촘촘한 배치와 불필요한 섹션 줄이기', '빠른 작업', '비공개 탭과 설정이 있는 패널',
      '무료 Google AI Studio 키(aistudio.google.com → Get API key): 모델이 스크린샷, CAPTCHA, 차트의 텍스트를 읽습니다. 키를 입력하면 스크린샷이 Google로 전송되며, 키가 없으면 이 기기를 벗어나지 않습니다.',
      '대체 Groq', '키 없음', '로컬 OCR은 인터넷이나 가입 없이 이 기기에서 텍스트를 인식합니다.',
      '파일을 여기에 놓으세요', '확장 프로그램 스토어에서 다운로드한 .crx 또는 .zip 파일을 이 영역으로 끌어오세요',
      '필터', '이름, 버전, 경로 또는 로드 오류별', '결과', '목록', '감지된 반복',
      'AI가 아는 내용', '기억된 검색어', '이 확장 프로그램은 민감한 권한을 요청합니다',
      '그래도 설치', '확장 프로그램을 확인할 수 없습니다: ', '이 확장 프로그램은 이미 추가되었습니다',
      '확장 프로그램 설치됨', '설치할 수 없습니다: ', '목록을 사용할 수 없습니다',
      '브라우저 메모리를 사용 설정할까요?', '모든 메모리를 삭제할까요?', '메모리가 삭제되었습니다', '페이지',
      '만드는 중…', '페이지, ', '만들기', '삭제됨: ', '가져옴:'
    ]
  }
  Object.keys(PAGE_UI_VALUES).forEach(function (L) {
    var values = PAGE_UI_VALUES[L]
    if (values.length !== PAGE_UI_KEYS.length) throw new Error('Page translation count mismatch for ' + L)
    var pageMap = {}
    PAGE_UI_KEYS.forEach(function (key, i) {
      pageMap[key] = /^(Не удалось проверить расширение:|Не удалось установить:|стр\.,|Удалено:|Импортировано:)$/.test(key)
        ? String(values[i]).replace(/\s+$/, '')
        : values[i]
    })
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, pageMap)
  })
  var CHROME_UI_KEYS = [
    'Стек', 'Стек создан:', 'Переименовать стек', 'Сохранить', 'Не удалось отложить вкладку',
    'Пароль сохранён для', 'Быстрый переход:', 'Панелей нет',
    'Добавьте сайт через Настройки → Web-панели', 'Добавить web-панель',
    'Откройте статью, чтобы включить режим чтения', 'Не удалось выделить статью со страницы',
    'Статья', 'Озвучка недоступна', 'Сохранено в копилку цитат', 'Не удалось сохранить',
    'Не удалось открыть печать', 'Печать недоступна', 'Видео нет на этой странице',
    'Видео не найдено', 'Сменить тему', 'Менеджер сессий', 'Создать стек из вкладки',
    'Очистить все стеки', 'Стеки очищены', 'Режим чтения', 'Картинка в картинке',
    'Нечего сохранять', 'Сессия', 'Сессия сохранена:', 'Ошибка сохранения', 'Открыто вкладок:',
    'Сохранить сессию', 'Сгруппировать вкладки по домену', 'Нет вкладок для группировки',
    'доменов', 'Дублировать вкладку', 'Новый стек из вкладки', 'Закрыть вкладки справа',
    'Закрыто вкладок:', 'Добавить в стек', 'Уже в стеке', 'Добавлено в',
    'Убрать из стека', 'Убрано из стека', 'Восстановлены вкладки после сбоя'
  ]
  var CHROME_UI_VALUES = {
    uk: ['Стек', 'Стек створено:', 'Перейменувати стек', 'Зберегти', 'Не вдалося призупинити вкладку', 'Пароль збережено для', 'Швидкий перехід:', 'Панелей немає', 'Додайте сайт через Налаштування → Вебпанелі', 'Додати вебпанель', 'Відкрийте статтю, щоб увімкнути режим читання', 'Не вдалося виділити статтю зі сторінки', 'Стаття', 'Озвучення недоступне', 'Збережено до скарбнички цитат', 'Не вдалося зберегти', 'Не вдалося відкрити друк', 'Друк недоступний', 'На цій сторінці немає відео', 'Відео не знайдено', 'Змінити тему', 'Менеджер сеансів', 'Створити стек із вкладки', 'Очистити всі стеки', 'Стеки очищено', 'Режим читання', 'Картинка в картинці', 'Немає чого зберігати', 'Сеанс', 'Сеанс збережено:', 'Помилка збереження', 'Відкрито вкладок:', 'Зберегти сеанс', 'Згрупувати вкладки за доменом', 'Немає вкладок для групування', 'доменів', 'Дублювати вкладку', 'Новий стек із вкладки', 'Закрити вкладки праворуч', 'Закрито вкладок:', 'Додати до стека', 'Уже в стеку', 'Додано до', 'Прибрати зі стека', 'Прибрано зі стека', 'Вкладки відновлено після збою'],
    hi: ['स्टैक', 'स्टैक बनाया गया:', 'स्टैक का नाम बदलें', 'सहेजें', 'टैब को मेमोरी से हटाया नहीं जा सका', 'इसके लिए पासवर्ड सहेजा गया:', 'त्वरित जाएँ:', 'कोई पैनल नहीं', 'सेटिंग → वेब पैनल से साइट जोड़ें', 'वेब पैनल जोड़ें', 'रीडर मोड चालू करने के लिए लेख खोलें', 'पृष्ठ से लेख निकाला नहीं जा सका', 'लेख', 'आवाज़ उपलब्ध नहीं', 'उद्धरण संग्रह में सहेजा गया', 'सहेजा नहीं जा सका', 'प्रिंट नहीं खुल सका', 'प्रिंट उपलब्ध नहीं', 'इस पृष्ठ पर कोई वीडियो नहीं', 'वीडियो नहीं मिला', 'थीम बदलें', 'सत्र प्रबंधक', 'टैब से स्टैक बनाएँ', 'सभी स्टैक साफ़ करें', 'स्टैक साफ़ किए गए', 'रीडर मोड', 'पिक्चर-इन-पिक्चर', 'सहेजने के लिए कुछ नहीं', 'सत्र', 'सत्र सहेजा गया:', 'सहेजने में त्रुटि', 'खुले टैब:', 'सत्र सहेजें', 'डोमेन के अनुसार टैब समूहित करें', 'समूहित करने के लिए टैब नहीं', 'डोमेन', 'टैब की प्रतिलिपि बनाएँ', 'टैब से नया स्टैक', 'दाईं ओर के टैब बंद करें', 'बंद किए गए टैब:', 'स्टैक में जोड़ें', 'पहले से स्टैक में है', 'इसमें जोड़ा गया', 'स्टैक से हटाएँ', 'स्टैक से हटाया गया', 'क्रैश के बाद टैब पुनर्स्थापित किए गए'],
    en: ['Stack', 'Stack created:', 'Rename stack', 'Save', 'Could not suspend tab', 'Password saved for', 'Quick jump:', 'No panels', 'Add a site from Settings → Web panels', 'Add web panel', 'Open an article to enable reader mode', 'Could not extract an article from the page', 'Article', 'Speech is unavailable', 'Saved to quote collection', 'Could not save', 'Could not open print dialog', 'Printing is unavailable', 'No video on this page', 'Video not found', 'Change theme', 'Session manager', 'Create stack from tab', 'Clear all stacks', 'Stacks cleared', 'Reader mode', 'Picture in picture', 'Nothing to save', 'Session', 'Session saved:', 'Save failed', 'Tabs opened:', 'Save session', 'Group tabs by domain', 'No tabs to group', 'domains', 'Duplicate tab', 'New stack from tab', 'Close tabs to the right', 'Tabs closed:', 'Add to stack', 'Already in a stack', 'Added to', 'Remove from stack', 'Removed from stack', 'Tabs restored after a crash'],
    de: ['Stapel', 'Stapel erstellt:', 'Stapel umbenennen', 'Speichern', 'Tab konnte nicht angehalten werden', 'Passwort gespeichert für', 'Schnell wechseln:', 'Keine Panels', 'Füge eine Website unter Einstellungen → Webpanels hinzu', 'Webpanel hinzufügen', 'Öffne einen Artikel, um den Lesemodus zu aktivieren', 'Artikel konnte nicht aus der Seite extrahiert werden', 'Artikel', 'Sprachausgabe nicht verfügbar', 'In der Zitatesammlung gespeichert', 'Speichern fehlgeschlagen', 'Druckdialog konnte nicht geöffnet werden', 'Drucken nicht verfügbar', 'Kein Video auf dieser Seite', 'Video nicht gefunden', 'Design ändern', 'Sitzungsverwaltung', 'Stapel aus Tab erstellen', 'Alle Stapel leeren', 'Stapel geleert', 'Lesemodus', 'Bild-in-Bild', 'Nichts zu speichern', 'Sitzung', 'Sitzung gespeichert:', 'Speichern fehlgeschlagen', 'Geöffnete Tabs:', 'Sitzung speichern', 'Tabs nach Domain gruppieren', 'Keine Tabs zum Gruppieren', 'Domains', 'Tab duplizieren', 'Neuer Stapel aus Tab', 'Tabs rechts schließen', 'Geschlossene Tabs:', 'Zum Stapel hinzufügen', 'Bereits in einem Stapel', 'Hinzugefügt zu', 'Aus Stapel entfernen', 'Aus Stapel entfernt', 'Tabs nach Absturz wiederhergestellt'],
    fr: ['Groupe', 'Groupe créé :', 'Renommer le groupe', 'Enregistrer', 'Impossible de suspendre l’onglet', 'Mot de passe enregistré pour', 'Accès rapide :', 'Aucun panneau', 'Ajoutez un site dans Paramètres → Panneaux Web', 'Ajouter un panneau Web', 'Ouvrez un article pour activer le mode lecture', 'Impossible d’extraire un article de la page', 'Article', 'Lecture audio indisponible', 'Enregistré dans la collection de citations', 'Enregistrement impossible', 'Impossible d’ouvrir l’impression', 'Impression indisponible', 'Aucune vidéo sur cette page', 'Vidéo introuvable', 'Changer de thème', 'Gestionnaire de sessions', 'Créer un groupe depuis l’onglet', 'Effacer tous les groupes', 'Groupes effacés', 'Mode lecture', 'Image dans l’image', 'Rien à enregistrer', 'Session', 'Session enregistrée :', 'Échec de l’enregistrement', 'Onglets ouverts :', 'Enregistrer la session', 'Grouper les onglets par domaine', 'Aucun onglet à grouper', 'domaines', 'Dupliquer l’onglet', 'Nouveau groupe depuis l’onglet', 'Fermer les onglets à droite', 'Onglets fermés :', 'Ajouter au groupe', 'Déjà dans un groupe', 'Ajouté à', 'Retirer du groupe', 'Retiré du groupe', 'Onglets restaurés après un plantage'],
    es: ['Grupo', 'Grupo creado:', 'Cambiar nombre del grupo', 'Guardar', 'No se pudo suspender la pestaña', 'Contraseña guardada para', 'Acceso rápido:', 'No hay paneles', 'Añade un sitio desde Ajustes → Paneles web', 'Añadir panel web', 'Abre un artículo para activar el modo lectura', 'No se pudo extraer el artículo de la página', 'Artículo', 'Voz no disponible', 'Guardado en la colección de citas', 'No se pudo guardar', 'No se pudo abrir la impresión', 'Impresión no disponible', 'No hay vídeo en esta página', 'Vídeo no encontrado', 'Cambiar tema', 'Administrador de sesiones', 'Crear grupo desde la pestaña', 'Borrar todos los grupos', 'Grupos borrados', 'Modo lectura', 'Imagen en imagen', 'No hay nada que guardar', 'Sesión', 'Sesión guardada:', 'Error al guardar', 'Pestañas abiertas:', 'Guardar sesión', 'Agrupar pestañas por dominio', 'No hay pestañas para agrupar', 'dominios', 'Duplicar pestaña', 'Nuevo grupo desde la pestaña', 'Cerrar pestañas de la derecha', 'Pestañas cerradas:', 'Añadir al grupo', 'Ya está en un grupo', 'Añadido a', 'Quitar del grupo', 'Quitado del grupo', 'Pestañas restauradas tras el cierre inesperado'],
    it: ['Gruppo', 'Gruppo creato:', 'Rinomina gruppo', 'Salva', 'Impossibile sospendere la scheda', 'Password salvata per', 'Accesso rapido:', 'Nessun pannello', 'Aggiungi un sito da Impostazioni → Pannelli web', 'Aggiungi pannello web', 'Apri un articolo per attivare la modalità lettura', 'Impossibile estrarre l’articolo dalla pagina', 'Articolo', 'Voce non disponibile', 'Salvato nella raccolta di citazioni', 'Impossibile salvare', 'Impossibile aprire la stampa', 'Stampa non disponibile', 'Nessun video in questa pagina', 'Video non trovato', 'Cambia tema', 'Gestore sessioni', 'Crea gruppo dalla scheda', 'Svuota tutti i gruppi', 'Gruppi svuotati', 'Modalità lettura', 'Picture-in-picture', 'Niente da salvare', 'Sessione', 'Sessione salvata:', 'Errore di salvataggio', 'Schede aperte:', 'Salva sessione', 'Raggruppa schede per dominio', 'Nessuna scheda da raggruppare', 'domini', 'Duplica scheda', 'Nuovo gruppo dalla scheda', 'Chiudi schede a destra', 'Schede chiuse:', 'Aggiungi al gruppo', 'Già in un gruppo', 'Aggiunto a', 'Rimuovi dal gruppo', 'Rimosso dal gruppo', 'Schede ripristinate dopo un arresto anomalo'],
    pt: ['Grupo', 'Grupo criado:', 'Renomear grupo', 'Guardar', 'Não foi possível suspender o separador', 'Palavra-passe guardada para', 'Acesso rápido:', 'Sem painéis', 'Adicione um site em Definições → Painéis web', 'Adicionar painel web', 'Abra um artigo para ativar o modo de leitura', 'Não foi possível extrair o artigo da página', 'Artigo', 'Voz indisponível', 'Guardado na coleção de citações', 'Não foi possível guardar', 'Não foi possível abrir a impressão', 'Impressão indisponível', 'Não há vídeo nesta página', 'Vídeo não encontrado', 'Mudar tema', 'Gestor de sessões', 'Criar grupo a partir do separador', 'Limpar todos os grupos', 'Grupos limpos', 'Modo de leitura', 'Imagem na imagem', 'Nada para guardar', 'Sessão', 'Sessão guardada:', 'Erro ao guardar', 'Separadores abertos:', 'Guardar sessão', 'Agrupar separadores por domínio', 'Não há separadores para agrupar', 'domínios', 'Duplicar separador', 'Novo grupo a partir do separador', 'Fechar separadores à direita', 'Separadores fechados:', 'Adicionar ao grupo', 'Já está num grupo', 'Adicionado a', 'Remover do grupo', 'Removido do grupo', 'Separadores restaurados após falha'],
    pl: ['Grupa', 'Utworzono grupę:', 'Zmień nazwę grupy', 'Zapisz', 'Nie udało się uśpić karty', 'Hasło zapisano dla', 'Szybkie przejście:', 'Brak paneli', 'Dodaj stronę w Ustawienia → Panele WWW', 'Dodaj panel WWW', 'Otwórz artykuł, aby włączyć tryb czytania', 'Nie udało się wyodrębnić artykułu ze strony', 'Artykuł', 'Odczyt głosowy niedostępny', 'Zapisano w kolekcji cytatów', 'Nie udało się zapisać', 'Nie udało się otworzyć drukowania', 'Drukowanie niedostępne', 'Brak wideo na tej stronie', 'Nie znaleziono wideo', 'Zmień motyw', 'Menedżer sesji', 'Utwórz grupę z karty', 'Wyczyść wszystkie grupy', 'Grupy wyczyszczone', 'Tryb czytania', 'Obraz w obrazie', 'Nie ma czego zapisać', 'Sesja', 'Zapisano sesję:', 'Błąd zapisu', 'Otwarte karty:', 'Zapisz sesję', 'Grupuj karty według domeny', 'Brak kart do grupowania', 'domen', 'Duplikuj kartę', 'Nowa grupa z karty', 'Zamknij karty po prawej', 'Zamknięte karty:', 'Dodaj do grupy', 'Już w grupie', 'Dodano do', 'Usuń z grupy', 'Usunięto z grupy', 'Przywrócono karty po awarii'],
    tr: ['Yığın', 'Yığın oluşturuldu:', 'Yığını yeniden adlandır', 'Kaydet', 'Sekme askıya alınamadı', 'Parola şunun için kaydedildi:', 'Hızlı geçiş:', 'Panel yok', 'Ayarlar → Web panelleri bölümünden site ekleyin', 'Web paneli ekle', 'Okuma modunu açmak için bir makale açın', 'Sayfadan makale çıkarılamadı', 'Makale', 'Seslendirme kullanılamıyor', 'Alıntı koleksiyonuna kaydedildi', 'Kaydedilemedi', 'Yazdırma açılamadı', 'Yazdırma kullanılamıyor', 'Bu sayfada video yok', 'Video bulunamadı', 'Temayı değiştir', 'Oturum yöneticisi', 'Sekmeden yığın oluştur', 'Tüm yığınları temizle', 'Yığınlar temizlendi', 'Okuma modu', 'Resim içinde resim', 'Kaydedilecek bir şey yok', 'Oturum', 'Oturum kaydedildi:', 'Kaydetme hatası', 'Açılan sekmeler:', 'Oturumu kaydet', 'Sekmeleri etki alanına göre grupla', 'Gruplanacak sekme yok', 'etki alanı', 'Sekmeyi çoğalt', 'Sekmeden yeni yığın', 'Sağdaki sekmeleri kapat', 'Kapatılan sekmeler:', 'Yığına ekle', 'Zaten bir yığında', 'Şuraya eklendi', 'Yığından kaldır', 'Yığından kaldırıldı', 'Çökme sonrası sekmeler geri yüklendi'],
    nl: ['Stapel', 'Stapel gemaakt:', 'Stapel hernoemen', 'Opslaan', 'Tabblad kon niet worden gepauzeerd', 'Wachtwoord opgeslagen voor', 'Snel naar:', 'Geen panelen', 'Voeg een site toe via Instellingen → Webpanelen', 'Webpaneel toevoegen', 'Open een artikel om de leesmodus in te schakelen', 'Artikel kon niet uit de pagina worden gehaald', 'Artikel', 'Spraak niet beschikbaar', 'Opgeslagen in de citatenverzameling', 'Opslaan mislukt', 'Afdrukken kon niet worden geopend', 'Afdrukken niet beschikbaar', 'Geen video op deze pagina', 'Video niet gevonden', 'Thema wijzigen', 'Sessiebeheer', 'Stapel maken van tabblad', 'Alle stapels wissen', 'Stapels gewist', 'Leesmodus', 'Beeld-in-beeld', 'Niets om op te slaan', 'Sessie', 'Sessie opgeslagen:', 'Opslaan mislukt', 'Geopende tabbladen:', 'Sessie opslaan', 'Tabbladen groeperen op domein', 'Geen tabbladen om te groeperen', 'domeinen', 'Tabblad dupliceren', 'Nieuwe stapel van tabblad', 'Tabbladen rechts sluiten', 'Gesloten tabbladen:', 'Aan stapel toevoegen', 'Zit al in een stapel', 'Toegevoegd aan', 'Uit stapel verwijderen', 'Uit stapel verwijderd', 'Tabbladen hersteld na crash'],
    sv: ['Stapel', 'Stapel skapad:', 'Byt namn på stapel', 'Spara', 'Det gick inte att pausa fliken', 'Lösenord sparat för', 'Snabböppna:', 'Inga paneler', 'Lägg till en webbplats via Inställningar → Webbpaneler', 'Lägg till webbpanel', 'Öppna en artikel för att aktivera läsläget', 'Det gick inte att hämta en artikel från sidan', 'Artikel', 'Uppläsning är inte tillgänglig', 'Sparat i citatsamlingen', 'Det gick inte att spara', 'Det gick inte att öppna utskrift', 'Utskrift är inte tillgänglig', 'Ingen video på den här sidan', 'Videon hittades inte', 'Byt tema', 'Sessionshanterare', 'Skapa stapel från flik', 'Rensa alla staplar', 'Staplar rensade', 'Läsläge', 'Bild-i-bild', 'Inget att spara', 'Session', 'Session sparad:', 'Det gick inte att spara', 'Öppnade flikar:', 'Spara session', 'Gruppera flikar efter domän', 'Inga flikar att gruppera', 'domäner', 'Duplicera flik', 'Ny stapel från flik', 'Stäng flikar till höger', 'Stängda flikar:', 'Lägg till i stapel', 'Redan i en stapel', 'Tillagd i', 'Ta bort från stapel', 'Borttagen från stapel', 'Flikar återställda efter en krasch'],
    fi: ['Pino', 'Pino luotu:', 'Nimeä pino uudelleen', 'Tallenna', 'Välilehteä ei voitu keskeyttää', 'Salasana tallennettu kohteelle', 'Siirry nopeasti:', 'Ei paneeleja', 'Lisää sivusto kohdassa Asetukset → Verkkopaneelit', 'Lisää verkkopaneeli', 'Avaa artikkeli lukutilan ottamiseksi käyttöön', 'Artikkelia ei voitu poimia sivulta', 'Artikkeli', 'Puhe ei ole käytettävissä', 'Tallennettu sitaattikokoelmaan', 'Tallennus epäonnistui', 'Tulostusta ei voitu avata', 'Tulostus ei ole käytettävissä', 'Tällä sivulla ei ole videota', 'Videota ei löytynyt', 'Vaihda teemaa', 'Istunnonhallinta', 'Luo pino välilehdestä', 'Tyhjennä kaikki pinot', 'Pinot tyhjennetty', 'Lukutila', 'Kuva kuvassa', 'Ei tallennettavaa', 'Istunto', 'Istunto tallennettu:', 'Tallennusvirhe', 'Avatut välilehdet:', 'Tallenna istunto', 'Ryhmitä välilehdet verkkotunnuksen mukaan', 'Ei ryhmitettäviä välilehtiä', 'verkkotunnusta', 'Monista välilehti', 'Uusi pino välilehdestä', 'Sulje oikeanpuoleiset välilehdet', 'Suljetut välilehdet:', 'Lisää pinoon', 'On jo pinossa', 'Lisätty kohteeseen', 'Poista pinosta', 'Poistettu pinosta', 'Välilehdet palautettiin kaatumisen jälkeen'],
    cs: ['Skupina', 'Skupina vytvořena:', 'Přejmenovat skupinu', 'Uložit', 'Kartu se nepodařilo pozastavit', 'Heslo uloženo pro', 'Rychlý přechod:', 'Žádné panely', 'Přidejte web v Nastavení → Webové panely', 'Přidat webový panel', 'Otevřete článek a zapněte režim čtení', 'Článek se ze stránky nepodařilo získat', 'Článek', 'Předčítání není dostupné', 'Uloženo do sbírky citátů', 'Uložení se nezdařilo', 'Nepodařilo se otevřít tisk', 'Tisk není dostupný', 'Na této stránce není video', 'Video nebylo nalezeno', 'Změnit motiv', 'Správce relací', 'Vytvořit skupinu z karty', 'Vymazat všechny skupiny', 'Skupiny vymazány', 'Režim čtení', 'Obraz v obraze', 'Není co uložit', 'Relace', 'Relace uložena:', 'Chyba ukládání', 'Otevřené karty:', 'Uložit relaci', 'Seskupit karty podle domény', 'Žádné karty ke seskupení', 'domén', 'Duplikovat kartu', 'Nová skupina z karty', 'Zavřít karty vpravo', 'Zavřené karty:', 'Přidat do skupiny', 'Ve skupině už je', 'Přidáno do', 'Odebrat ze skupiny', 'Odebráno ze skupiny', 'Karty obnoveny po pádu'],
    ro: ['Grup', 'Grup creat:', 'Redenumește grupul', 'Salvează', 'Fila nu a putut fi suspendată', 'Parolă salvată pentru', 'Salt rapid:', 'Nu există panouri', 'Adaugă un site din Setări → Panouri web', 'Adaugă panou web', 'Deschide un articol pentru a activa modul de citire', 'Articolul nu a putut fi extras din pagină', 'Articol', 'Redarea vocală nu este disponibilă', 'Salvat în colecția de citate', 'Salvarea a eșuat', 'Nu s-a putut deschide imprimarea', 'Imprimarea nu este disponibilă', 'Nu există videoclip pe această pagină', 'Videoclipul nu a fost găsit', 'Schimbă tema', 'Manager de sesiuni', 'Creează grup din filă', 'Șterge toate grupurile', 'Grupuri șterse', 'Mod de citire', 'Imagine în imagine', 'Nimic de salvat', 'Sesiune', 'Sesiune salvată:', 'Eroare la salvare', 'File deschise:', 'Salvează sesiunea', 'Grupează filele după domeniu', 'Nu există file de grupat', 'domenii', 'Duplică fila', 'Grup nou din filă', 'Închide filele din dreapta', 'File închise:', 'Adaugă în grup', 'Deja într-un grup', 'Adăugat în', 'Elimină din grup', 'Eliminat din grup', 'Filele au fost restaurate după o cădere'],
    el: ['Στοίβα', 'Η στοίβα δημιουργήθηκε:', 'Μετονομασία στοίβας', 'Αποθήκευση', 'Δεν ήταν δυνατή η αναστολή της καρτέλας', 'Ο κωδικός αποθηκεύτηκε για', 'Γρήγορη μετάβαση:', 'Δεν υπάρχουν πλαίσια', 'Προσθέστε ιστότοπο από τις Ρυθμίσεις → Πλαίσια ιστού', 'Προσθήκη πλαισίου ιστού', 'Ανοίξτε ένα άρθρο για να ενεργοποιήσετε τη λειτουργία ανάγνωσης', 'Δεν ήταν δυνατή η εξαγωγή άρθρου από τη σελίδα', 'Άρθρο', 'Η εκφώνηση δεν είναι διαθέσιμη', 'Αποθηκεύτηκε στη συλλογή αποσπασμάτων', 'Δεν ήταν δυνατή η αποθήκευση', 'Δεν ήταν δυνατό το άνοιγμα της εκτύπωσης', 'Η εκτύπωση δεν είναι διαθέσιμη', 'Δεν υπάρχει βίντεο σε αυτή τη σελίδα', 'Δεν βρέθηκε βίντεο', 'Αλλαγή θέματος', 'Διαχείριση συνεδριών', 'Δημιουργία στοίβας από καρτέλα', 'Εκκαθάριση όλων των στοιβών', 'Οι στοίβες εκκαθαρίστηκαν', 'Λειτουργία ανάγνωσης', 'Εικόνα μέσα σε εικόνα', 'Δεν υπάρχει κάτι για αποθήκευση', 'Συνεδρία', 'Η συνεδρία αποθηκεύτηκε:', 'Σφάλμα αποθήκευσης', 'Ανοιχτές καρτέλες:', 'Αποθήκευση συνεδρίας', 'Ομαδοποίηση καρτελών ανά τομέα', 'Δεν υπάρχουν καρτέλες για ομαδοποίηση', 'τομείς', 'Αντιγραφή καρτέλας', 'Νέα στοίβα από καρτέλα', 'Κλείσιμο καρτελών στα δεξιά', 'Κλειστές καρτέλες:', 'Προσθήκη στη στοίβα', 'Ήδη σε στοίβα', 'Προστέθηκε στη', 'Αφαίρεση από τη στοίβα', 'Αφαιρέθηκε από τη στοίβα', 'Οι καρτέλες επαναφέρθηκαν μετά από σφάλμα'],
    be: ['Стэк', 'Стэк створаны:', 'Перайменаваць стэк', 'Захаваць', 'Не ўдалося прыпыніць укладку', 'Пароль захаваны для', 'Хуткі пераход:', 'Панэляў няма', 'Дадайце сайт праз Налады → Вэб-панэлі', 'Дадаць вэб-панэль', 'Адкрыйце артыкул, каб уключыць рэжым чытання', 'Не ўдалося вылучыць артыкул са старонкі', 'Артыкул', 'Агучванне недаступнае', 'Захавана ў скарбонку цытат', 'Не ўдалося захаваць', 'Не ўдалося адкрыць друк', 'Друк недаступны', 'На гэтай старонцы няма відэа', 'Відэа не знойдзена', 'Змяніць тэму', 'Менеджар сеансаў', 'Стварыць стэк з укладкі', 'Ачысціць усе стэкі', 'Стэкі ачышчаны', 'Рэжым чытання', 'Карцінка ў карцінцы', 'Няма чаго захоўваць', 'Сеанс', 'Сеанс захаваны:', 'Памылка захавання', 'Адкрыта ўкладак:', 'Захаваць сеанс', 'Згрупаваць укладкі паводле дамена', 'Няма ўкладак для групавання', 'даменаў', 'Дубляваць укладку', 'Новы стэк з укладкі', 'Закрыць укладкі справа', 'Закрыта ўкладак:', 'Дадаць у стэк', 'Ужо ў стэку', 'Дададзена ў', 'Прыбраць са стэка', 'Прыбрана са стэка', 'Укладкі адноўлены пасля збою'],
    kk: ['Стек', 'Стек жасалды:', 'Стектің атын өзгерту', 'Сақтау', 'Қойындыны кідірту мүмкін болмады', 'Құпиясөз сақталды:', 'Жылдам өту:', 'Панельдер жоқ', 'Баптаулар → Веб-панельдер арқылы сайт қосыңыз', 'Веб-панель қосу', 'Оқу режимін қосу үшін мақаланы ашыңыз', 'Беттен мақаланы алу мүмкін болмады', 'Мақала', 'Дауыстап оқу қолжетімсіз', 'Дәйексөздер жинағына сақталды', 'Сақтау мүмкін болмады', 'Басып шығару терезесін ашу мүмкін болмады', 'Басып шығару қолжетімсіз', 'Бұл бетте видео жоқ', 'Видео табылмады', 'Тақырыпты өзгерту', 'Сеанс менеджері', 'Қойындыдан стек жасау', 'Барлық стекті тазалау', 'Стектер тазартылды', 'Оқу режимі', 'Сурет ішіндегі сурет', 'Сақтайтын ештеңе жоқ', 'Сеанс', 'Сеанс сақталды:', 'Сақтау қатесі', 'Ашылған қойындылар:', 'Сеансты сақтау', 'Қойындыларды домен бойынша топтау', 'Топтайтын қойындылар жоқ', 'домен', 'Қойындыны көшіру', 'Қойындыдан жаңа стек', 'Оң жақтағы қойындыларды жабу', 'Жабылған қойындылар:', 'Стекке қосу', 'Стекте бар', 'Мынаған қосылды', 'Стектен алып тастау', 'Стектен алынды', 'Апаттан кейін қойындылар қалпына келтірілді'],
    ar: ['مجموعة علامات تبويب', 'تم إنشاء المجموعة:', 'إعادة تسمية المجموعة', 'حفظ', 'تعذر تعليق علامة التبويب', 'تم حفظ كلمة المرور لـ', 'انتقال سريع:', 'لا توجد لوحات', 'أضف موقعًا من الإعدادات ← لوحات الويب', 'إضافة لوحة ويب', 'افتح مقالة لتفعيل وضع القراءة', 'تعذر استخراج المقالة من الصفحة', 'مقالة', 'القراءة الصوتية غير متاحة', 'تم الحفظ في مجموعة الاقتباسات', 'تعذر الحفظ', 'تعذر فتح الطباعة', 'الطباعة غير متاحة', 'لا يوجد فيديو في هذه الصفحة', 'لم يتم العثور على فيديو', 'تغيير السمة', 'مدير الجلسات', 'إنشاء مجموعة من علامة التبويب', 'مسح كل المجموعات', 'تم مسح المجموعات', 'وضع القراءة', 'صورة داخل صورة', 'لا شيء لحفظه', 'جلسة', 'تم حفظ الجلسة:', 'خطأ في الحفظ', 'علامات التبويب المفتوحة:', 'حفظ الجلسة', 'تجميع علامات التبويب حسب النطاق', 'لا توجد علامات تبويب للتجميع', 'نطاقات', 'تكرار علامة التبويب', 'مجموعة جديدة من علامة التبويب', 'إغلاق علامات التبويب على اليمين', 'علامات التبويب المغلقة:', 'إضافة إلى المجموعة', 'موجودة في مجموعة بالفعل', 'تمت الإضافة إلى', 'إزالة من المجموعة', 'تمت الإزالة من المجموعة', 'تمت استعادة علامات التبويب بعد التعطل'],
    he: ['ערימת כרטיסיות', 'הערימה נוצרה:', 'שינוי שם הערימה', 'שמירה', 'לא ניתן להשעות את הכרטיסייה', 'הסיסמה נשמרה עבור', 'מעבר מהיר:', 'אין לוחות', 'הוסיפו אתר דרך הגדרות ← לוחות אינטרנט', 'הוספת לוח אינטרנט', 'פתחו כתבה כדי להפעיל מצב קריאה', 'לא ניתן לחלץ כתבה מהדף', 'כתבה', 'הקראה קולית אינה זמינה', 'נשמר באוסף הציטוטים', 'השמירה נכשלה', 'לא ניתן לפתוח את חלון ההדפסה', 'ההדפסה אינה זמינה', 'אין סרטון בדף הזה', 'הסרטון לא נמצא', 'שינוי ערכת נושא', 'מנהל הפעלות', 'יצירת ערימה מהכרטיסייה', 'ניקוי כל הערימות', 'הערימות נוקו', 'מצב קריאה', 'תמונה בתוך תמונה', 'אין מה לשמור', 'הפעלה', 'ההפעלה נשמרה:', 'השמירה נכשלה', 'כרטיסיות שנפתחו:', 'שמירת הפעלה', 'קיבוץ כרטיסיות לפי מתחם', 'אין כרטיסיות לקיבוץ', 'מתחמים', 'שכפול כרטיסייה', 'ערימה חדשה מהכרטיסייה', 'סגירת הכרטיסיות שמימין', 'כרטיסיות שנסגרו:', 'הוספה לערימה', 'כבר נמצאת בערימה', 'נוסף אל', 'הסרה מהערימה', 'הוסר מהערימה', 'הכרטיסיות שוחזרו לאחר קריסה'],
    zh: ['标签组', '已创建标签组：', '重命名标签组', '保存', '无法暂停标签页', '已保存密码：', '快速跳转：', '没有面板', '通过“设置 → 网页面板”添加网站', '添加网页面板', '打开文章以启用阅读模式', '无法从页面提取文章', '文章', '语音朗读不可用', '已保存到引言收藏夹', '保存失败', '无法打开打印窗口', '打印不可用', '此页面没有视频', '未找到视频', '更换主题', '会话管理器', '从标签页创建组', '清除所有标签组', '标签组已清除', '阅读模式', '画中画', '没有可保存的内容', '会话', '会话已保存：', '保存失败', '已打开的标签页：', '保存会话', '按域名分组标签页', '没有可分组的标签页', '个域名', '复制标签页', '从标签页新建组', '关闭右侧标签页', '已关闭的标签页：', '添加到标签组', '已在标签组中', '已添加到', '从标签组移除', '已从标签组移除', '崩溃后已恢复标签页'],
    ja: ['タブグループ', 'グループを作成しました:', 'グループ名を変更', '保存', 'タブを一時停止できませんでした', 'パスワードを保存しました:', 'クイック移動:', 'パネルはありません', '設定 → Web パネルからサイトを追加してください', 'Web パネルを追加', 'リーダーモードを有効にするには記事を開いてください', 'ページから記事を抽出できませんでした', '記事', '読み上げを利用できません', '引用コレクションに保存しました', '保存できませんでした', '印刷画面を開けませんでした', '印刷を利用できません', 'このページに動画はありません', '動画が見つかりません', 'テーマを変更', 'セッションマネージャー', 'タブからグループを作成', 'すべてのグループを消去', 'グループを消去しました', 'リーダーモード', 'ピクチャー イン ピクチャー', '保存するものがありません', 'セッション', 'セッションを保存しました:', '保存エラー', '開いたタブ:', 'セッションを保存', 'ドメインごとにタブをグループ化', 'グループ化するタブがありません', 'ドメイン', 'タブを複製', 'タブから新しいグループ', '右側のタブを閉じる', '閉じたタブ:', 'グループに追加', 'すでにグループ内です', '追加先:', 'グループから削除', 'グループから削除しました', 'クラッシュ後にタブを復元しました'],
    ko: ['탭 그룹', '그룹을 만들었습니다:', '그룹 이름 바꾸기', '저장', '탭을 일시 중지하지 못했습니다', '비밀번호 저장 위치:', '빠른 이동:', '패널이 없습니다', '설정 → 웹 패널에서 사이트를 추가하세요', '웹 패널 추가', '읽기 모드를 사용하려면 기사를 여세요', '페이지에서 기사를 추출하지 못했습니다', '기사', '음성 읽기를 사용할 수 없습니다', '인용 모음에 저장했습니다', '저장하지 못했습니다', '인쇄 창을 열지 못했습니다', '인쇄를 사용할 수 없습니다', '이 페이지에 동영상이 없습니다', '동영상을 찾을 수 없습니다', '테마 변경', '세션 관리자', '탭에서 그룹 만들기', '모든 그룹 지우기', '그룹을 지웠습니다', '읽기 모드', '화면 속 화면', '저장할 항목이 없습니다', '세션', '세션 저장됨:', '저장 오류', '열린 탭:', '세션 저장', '도메인별로 탭 그룹화', '그룹화할 탭이 없습니다', '개 도메인', '탭 복제', '탭에서 새 그룹 만들기', '오른쪽 탭 닫기', '닫힌 탭:', '그룹에 추가', '이미 그룹에 있습니다', '추가 위치:', '그룹에서 제거', '그룹에서 제거됨', '충돌 후 탭이 복원되었습니다']
  }
  Object.keys(CHROME_UI_VALUES).forEach(function (L) {
    var values = CHROME_UI_VALUES[L]
    if (values.length !== CHROME_UI_KEYS.length) throw new Error('Chrome translation count mismatch for ' + L)
    var chromeMap = {}
    CHROME_UI_KEYS.forEach(function (key, i) { chromeMap[key] = values[i] })
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, chromeMap)
  })
  var TRANSFER_UI_KEYS = [
    'шт.', 'пусто', 'Удалить пароль для', 'Пароль удалён', 'Не удалилось:',
    'Сначала выберите источник', 'Отметьте, что переносить', 'Импортирую…', 'неизвестная',
    'история:', 'найдено', 'пароли:', 'Перенести данные из прошлого браузера?',
    'Найдено:', 'Импорт идёт локально — закладки, история и пароли останутся на этом устройстве.',
    'Открыть импорт', 'нет связи с облаком', 'облако вернуло не JSON', 'это не файл данных Vio',
    'аккаунт не подключён', 'не выдали токен', 'укажите адрес файла WebDAV',
    'файла в облаке пока нет — нажмите «Сохранить»', 'облако ответило HTTP', 'пустой файл',
    'выберите облако', 'OAuth нужен только для Google Drive и Dropbox',
    'придумайте пароль шифрования (4+ символа)', 'Открываю страницу входа…',
    'Жду разрешения в браузере…', 'вход прерван', 'Аккаунт подключён', 'Облако подключено',
    'Не удалось подключить:', 'Шифрую…', 'Данные сохранены в облако', 'Читаю…',
    'Данные загружены из облака'
  ]
  var TRANSFER_UI_VALUES = {
    uk: ['шт.', 'порожньо', 'Видалити пароль для', 'Пароль видалено', 'Не вдалося видалити:', 'Спочатку виберіть джерело', 'Позначте, що переносити', 'Імпортую…', 'невідома', 'історія:', 'знайдено', 'паролі:', 'Перенести дані з попереднього браузера?', 'Знайдено:', 'Імпорт відбувається локально — закладки, історія та паролі залишаться на цьому пристрої.', 'Відкрити імпорт', 'немає зв’язку з хмарою', 'хмара повернула не JSON', 'це не файл даних Vio', 'обліковий запис не підключено', 'токен не видано', 'укажіть адресу файлу WebDAV', 'файлу в хмарі ще немає — натисніть «Зберегти»', 'хмара відповіла HTTP', 'порожній файл', 'виберіть хмару', 'OAuth потрібен лише для Google Drive і Dropbox', 'придумайте пароль шифрування (4+ символи)', 'Відкриваю сторінку входу…', 'Очікую дозволу в браузері…', 'вхід перервано', 'Обліковий запис підключено', 'Хмару підключено', 'Не вдалося підключитися:', 'Шифрую…', 'Дані збережено у хмарі', 'Читаю…', 'Дані завантажено з хмари'],
    hi: ['प्रविष्टियाँ', 'खाली', 'इसके लिए पासवर्ड हटाएँ', 'पासवर्ड हटाया गया', 'हटाया नहीं जा सका:', 'पहले स्रोत चुनें', 'चुनें कि क्या स्थानांतरित करना है', 'आयात हो रहा है…', 'अज्ञात', 'इतिहास:', 'मिले', 'पासवर्ड:', 'पिछले ब्राउज़र से डेटा स्थानांतरित करें?', 'मिले:', 'आयात स्थानीय रूप से होता है — बुकमार्क, इतिहास और पासवर्ड इसी डिवाइस पर रहेंगे।', 'आयात खोलें', 'क्लाउड से संपर्क नहीं हो सका', 'क्लाउड ने गैर-JSON डेटा लौटाया', 'यह Vio डेटा फ़ाइल नहीं है', 'खाता कनेक्ट नहीं है', 'टोकन नहीं मिला', 'WebDAV फ़ाइल का पता दें', 'क्लाउड में फ़ाइल नहीं है — “सहेजें” दबाएँ', 'क्लाउड ने HTTP उत्तर दिया', 'खाली फ़ाइल', 'क्लाउड चुनें', 'OAuth केवल Google Drive और Dropbox के लिए आवश्यक है', 'एन्क्रिप्शन पासवर्ड बनाएँ (कम से कम 4 अक्षर)', 'साइन-इन पृष्ठ खोला जा रहा है…', 'ब्राउज़र में अनुमति की प्रतीक्षा…', 'साइन-इन रद्द किया गया', 'खाता कनेक्ट हो गया', 'क्लाउड कनेक्ट हो गया', 'कनेक्ट नहीं हो सका:', 'एन्क्रिप्ट हो रहा है…', 'डेटा क्लाउड में सहेजा गया', 'पढ़ा जा रहा है…', 'क्लाउड से डेटा डाउनलोड हुआ'],
    en: ['items', 'empty', 'Delete password for', 'Password deleted', 'Could not delete:', 'Select a source first', 'Choose what to import', 'Importing…', 'unknown', 'history:', 'found', 'passwords:', 'Transfer data from your previous browser?', 'Found:', 'Import runs locally — bookmarks, history, and passwords stay on this device.', 'Open import', 'Could not connect to cloud', 'Cloud returned invalid JSON', 'This is not a Vio data file', 'Account is not connected', 'Token was not issued', 'Enter the WebDAV file address', 'There is no cloud file yet — click “Save”', 'Cloud responded with HTTP', 'Empty file', 'Select a cloud provider', 'OAuth is only needed for Google Drive and Dropbox', 'Choose an encryption password (4+ characters)', 'Opening sign-in page…', 'Waiting for approval in the browser…', 'Sign-in cancelled', 'Account connected', 'Cloud connected', 'Could not connect:', 'Encrypting…', 'Data saved to cloud', 'Reading…', 'Data downloaded from cloud'],
    de: ['Einträge', 'leer', 'Passwort löschen für', 'Passwort gelöscht', 'Löschen fehlgeschlagen:', 'Wähle zuerst eine Quelle aus', 'Wähle die zu übertragenden Daten aus', 'Import läuft…', 'unbekannt', 'Verlauf:', 'gefunden', 'Passwörter:', 'Daten aus dem vorherigen Browser übertragen?', 'Gefunden:', 'Der Import erfolgt lokal — Lesezeichen, Verlauf und Passwörter bleiben auf diesem Gerät.', 'Import öffnen', 'Keine Verbindung zur Cloud', 'Cloud hat kein JSON zurückgegeben', 'Dies ist keine Vio-Datendatei', 'Konto nicht verbunden', 'Kein Token erhalten', 'Gib die WebDAV-Dateiadresse ein', 'Noch keine Datei in der Cloud — klicke auf „Speichern“', 'Cloud antwortete mit HTTP', 'Leere Datei', 'Cloud auswählen', 'OAuth ist nur für Google Drive und Dropbox erforderlich', 'Verschlüsselungspasswort festlegen (mindestens 4 Zeichen)', 'Anmeldeseite wird geöffnet…', 'Warte auf die Freigabe im Browser…', 'Anmeldung abgebrochen', 'Konto verbunden', 'Cloud verbunden', 'Verbindung fehlgeschlagen:', 'Verschlüsselung läuft…', 'Daten in der Cloud gespeichert', 'Wird gelesen…', 'Daten aus der Cloud geladen'],
    fr: ['éléments', 'vide', 'Supprimer le mot de passe pour', 'Mot de passe supprimé', 'Suppression impossible :', 'Choisissez d’abord une source', 'Choisissez les données à transférer', 'Importation…', 'inconnu', 'historique :', 'trouvés', 'mots de passe :', 'Transférer les données de l’ancien navigateur ?', 'Trouvé :', 'L’importation est locale — les favoris, l’historique et les mots de passe restent sur cet appareil.', 'Ouvrir l’importation', 'Connexion au cloud impossible', 'Le cloud a renvoyé un JSON invalide', 'Ce fichier ne contient pas de données Vio', 'Compte non connecté', 'Aucun jeton reçu', 'Indiquez l’adresse du fichier WebDAV', 'Aucun fichier dans le cloud — cliquez sur « Enregistrer »', 'Le cloud a répondu HTTP', 'Fichier vide', 'Choisissez un cloud', 'OAuth est requis uniquement pour Google Drive et Dropbox', 'Choisissez un mot de passe de chiffrement (4 caractères ou plus)', 'Ouverture de la page de connexion…', 'En attente de l’autorisation dans le navigateur…', 'Connexion annulée', 'Compte connecté', 'Cloud connecté', 'Connexion impossible :', 'Chiffrement…', 'Données enregistrées dans le cloud', 'Lecture…', 'Données téléchargées depuis le cloud'],
    es: ['elementos', 'vacío', 'Eliminar la contraseña de', 'Contraseña eliminada', 'No se pudo eliminar:', 'Primero selecciona un origen', 'Elige qué quieres transferir', 'Importando…', 'desconocido', 'historial:', 'encontrados', 'contraseñas:', '¿Transferir los datos del navegador anterior?', 'Encontrado:', 'La importación es local: los marcadores, el historial y las contraseñas permanecen en este dispositivo.', 'Abrir importación', 'No se pudo conectar a la nube', 'La nube devolvió un JSON no válido', 'Este no es un archivo de datos de Vio', 'La cuenta no está conectada', 'No se recibió el token', 'Indica la dirección del archivo WebDAV', 'Aún no hay ningún archivo en la nube: pulsa «Guardar»', 'La nube respondió HTTP', 'Archivo vacío', 'Selecciona una nube', 'OAuth solo es necesario para Google Drive y Dropbox', 'Crea una contraseña de cifrado (4 caracteres o más)', 'Abriendo la página de inicio de sesión…', 'Esperando autorización en el navegador…', 'Inicio de sesión cancelado', 'Cuenta conectada', 'Nube conectada', 'No se pudo conectar:', 'Cifrando…', 'Datos guardados en la nube', 'Leyendo…', 'Datos descargados de la nube'],
    it: ['elementi', 'vuoto', 'Elimina password per', 'Password eliminata', 'Impossibile eliminare:', 'Seleziona prima una fonte', 'Scegli cosa trasferire', 'Importazione…', 'sconosciuto', 'cronologia:', 'trovati', 'password:', 'Trasferire i dati dal browser precedente?', 'Trovato:', 'L’importazione è locale: segnalibri, cronologia e password restano su questo dispositivo.', 'Apri importazione', 'Impossibile connettersi al cloud', 'Il cloud ha restituito JSON non valido', 'Questo non è un file di dati Vio', 'Account non connesso', 'Token non ricevuto', 'Indica l’indirizzo del file WebDAV', 'Nessun file nel cloud — fai clic su «Salva»', 'Il cloud ha risposto HTTP', 'File vuoto', 'Seleziona un cloud', 'OAuth è necessario solo per Google Drive e Dropbox', 'Scegli una password di cifratura (almeno 4 caratteri)', 'Apertura della pagina di accesso…', 'In attesa dell’autorizzazione nel browser…', 'Accesso annullato', 'Account connesso', 'Cloud connesso', 'Impossibile connettersi:', 'Cifratura…', 'Dati salvati nel cloud', 'Lettura…', 'Dati scaricati dal cloud'],
    pt: ['itens', 'vazio', 'Eliminar palavra-passe de', 'Palavra-passe eliminada', 'Não foi possível eliminar:', 'Selecione primeiro uma origem', 'Escolha o que pretende transferir', 'A importar…', 'desconhecida', 'histórico:', 'encontrado', 'palavras-passe:', 'Transferir dados do navegador anterior?', 'Encontrado:', 'A importação é local — os favoritos, o histórico e as palavras-passe ficam neste dispositivo.', 'Abrir importação', 'Não foi possível ligar à nuvem', 'A nuvem devolveu JSON inválido', 'Este não é um ficheiro de dados do Vio', 'A conta não está ligada', 'O token não foi fornecido', 'Indique o endereço do ficheiro WebDAV', 'Ainda não há ficheiro na nuvem — clique em «Guardar»', 'A nuvem respondeu HTTP', 'Ficheiro vazio', 'Escolha uma nuvem', 'O OAuth só é necessário para o Google Drive e o Dropbox', 'Crie uma palavra-passe de encriptação (4 ou mais caracteres)', 'A abrir a página de início de sessão…', 'À espera da autorização no navegador…', 'Início de sessão cancelado', 'Conta ligada', 'Nuvem ligada', 'Não foi possível ligar:', 'A encriptar…', 'Dados guardados na nuvem', 'A ler…', 'Dados transferidos da nuvem'],
    pl: ['szt.', 'pusto', 'Usuń hasło dla', 'Hasło usunięto', 'Nie udało się usunąć:', 'Najpierw wybierz źródło', 'Wybierz dane do przeniesienia', 'Importowanie…', 'nieznana', 'historia:', 'znaleziono', 'hasła:', 'Przenieść dane z poprzedniej przeglądarki?', 'Znaleziono:', 'Import odbywa się lokalnie — zakładki, historia i hasła pozostają na tym urządzeniu.', 'Otwórz import', 'Brak połączenia z chmurą', 'Chmura zwróciła nieprawidłowy JSON', 'To nie jest plik danych Vio', 'Konto nie jest połączone', 'Nie otrzymano tokenu', 'Podaj adres pliku WebDAV', 'W chmurze nie ma jeszcze pliku — kliknij „Zapisz”', 'Chmura odpowiedziała HTTP', 'Pusty plik', 'Wybierz chmurę', 'OAuth jest wymagany tylko dla Google Drive i Dropbox', 'Ustaw hasło szyfrowania (co najmniej 4 znaki)', 'Otwieranie strony logowania…', 'Oczekiwanie na zgodę w przeglądarce…', 'Logowanie anulowane', 'Konto połączone', 'Chmura połączona', 'Nie udało się połączyć:', 'Szyfrowanie…', 'Dane zapisano w chmurze', 'Odczytywanie…', 'Pobrano dane z chmury'],
    tr: ['öğe', 'boş', 'Şunun parolasını sil:', 'Parola silindi', 'Silinemedi:', 'Önce bir kaynak seçin', 'Aktarılacak öğeleri seçin', 'İçe aktarılıyor…', 'bilinmiyor', 'geçmiş:', 'bulundu', 'parolalar:', 'Önceki tarayıcıdaki veriler aktarılsın mı?', 'Bulunan:', 'İçe aktarma yerel olarak yapılır — yer imleri, geçmiş ve parolalar bu cihazda kalır.', 'İçe aktarmayı aç', 'Bulut bağlantısı kurulamadı', 'Bulut geçersiz JSON döndürdü', 'Bu bir Vio veri dosyası değil', 'Hesap bağlı değil', 'Belirteç alınamadı', 'WebDAV dosya adresini girin', 'Bulutta henüz dosya yok — “Kaydet”e tıklayın', 'Bulut HTTP yanıtı verdi', 'Boş dosya', 'Bir bulut sağlayıcısı seçin', 'OAuth yalnızca Google Drive ve Dropbox için gereklidir', 'Bir şifreleme parolası belirleyin (4+ karakter)', 'Oturum açma sayfası açılıyor…', 'Tarayıcıda izin bekleniyor…', 'Oturum açma iptal edildi', 'Hesap bağlandı', 'Bulut bağlandı', 'Bağlanılamadı:', 'Şifreleniyor…', 'Veriler buluta kaydedildi', 'Okunuyor…', 'Veriler buluttan indirildi'],
    nl: ['items', 'leeg', 'Wachtwoord verwijderen voor', 'Wachtwoord verwijderd', 'Verwijderen mislukt:', 'Kies eerst een bron', 'Kies wat je wilt overzetten', 'Importeren…', 'onbekend', 'geschiedenis:', 'gevonden', 'wachtwoorden:', 'Gegevens overzetten uit de vorige browser?', 'Gevonden:', 'De import gebeurt lokaal — bladwijzers, geschiedenis en wachtwoorden blijven op dit apparaat.', 'Import openen', 'Geen verbinding met de cloud', 'De cloud gaf geen geldige JSON terug', 'Dit is geen Vio-gegevensbestand', 'Account niet verbonden', 'Geen token ontvangen', 'Geef het WebDAV-bestandsadres op', 'Er staat nog geen bestand in de cloud — klik op “Opslaan”', 'Cloud antwoordde met HTTP', 'Leeg bestand', 'Kies een cloudprovider', 'OAuth is alleen nodig voor Google Drive en Dropbox', 'Kies een coderingswachtwoord (minimaal 4 tekens)', 'Aanmeldpagina openen…', 'Wachten op toestemming in de browser…', 'Aanmelden geannuleerd', 'Account verbonden', 'Cloud verbonden', 'Verbinden mislukt:', 'Versleutelen…', 'Gegevens opgeslagen in de cloud', 'Lezen…', 'Gegevens gedownload uit de cloud'],
    sv: ['st.', 'tomt', 'Ta bort lösenord för', 'Lösenord borttaget', 'Det gick inte att ta bort:', 'Välj en källa först', 'Välj vad som ska överföras', 'Importerar…', 'okänd', 'historik:', 'hittades', 'lösenord:', 'Överföra data från den tidigare webbläsaren?', 'Hittades:', 'Importen sker lokalt — bokmärken, historik och lösenord stannar på den här enheten.', 'Öppna import', 'Det gick inte att ansluta till molnet', 'Molnet returnerade ogiltig JSON', 'Det här är inte en Vio-datafil', 'Kontot är inte anslutet', 'Ingen token utfärdades', 'Ange WebDAV-filens adress', 'Det finns ingen fil i molnet ännu — klicka på ”Spara”', 'Molnet svarade med HTTP', 'Tom fil', 'Välj ett moln', 'OAuth behövs bara för Google Drive och Dropbox', 'Ange ett krypteringslösenord (minst 4 tecken)', 'Öppnar inloggningssidan…', 'Väntar på godkännande i webbläsaren…', 'Inloggningen avbröts', 'Kontot är anslutet', 'Molnet är anslutet', 'Det gick inte att ansluta:', 'Krypterar…', 'Data sparad i molnet', 'Läser…', 'Data hämtad från molnet'],
    fi: ['kpl', 'tyhjä', 'Poista salasana kohteelta', 'Salasana poistettu', 'Poistaminen epäonnistui:', 'Valitse ensin lähde', 'Valitse siirrettävät tiedot', 'Tuodaan…', 'tuntematon', 'historia:', 'löytyi', 'salasanat:', 'Siirretäänkö tiedot edellisestä selaimesta?', 'Löytyi:', 'Tuonti tapahtuu paikallisesti — kirjanmerkit, historia ja salasanat pysyvät tällä laitteella.', 'Avaa tuonti', 'Pilveen ei saada yhteyttä', 'Pilvi palautti virheellisen JSON-tiedoston', 'Tämä ei ole Vio-datatiedosto', 'Tiliä ei ole yhdistetty', 'Tunnistetta ei saatu', 'Anna WebDAV-tiedoston osoite', 'Pilvessä ei ole vielä tiedostoa — napsauta ”Tallenna”', 'Pilvi vastasi HTTP', 'Tyhjä tiedosto', 'Valitse pilvipalvelu', 'OAuth tarvitaan vain Google Driveen ja Dropboxiin', 'Valitse salauksen salasana (vähintään 4 merkkiä)', 'Avataan kirjautumissivua…', 'Odotetaan vahvistusta selaimessa…', 'Kirjautuminen peruutettiin', 'Tili yhdistetty', 'Pilvi yhdistetty', 'Yhdistäminen epäonnistui:', 'Salataan…', 'Tiedot tallennettiin pilveen', 'Luetaan…', 'Tiedot ladattiin pilvestä'],
    cs: ['položek', 'prázdné', 'Smazat heslo pro', 'Heslo smazáno', 'Nepodařilo se smazat:', 'Nejprve vyberte zdroj', 'Vyberte, co chcete přenést', 'Importuji…', 'neznámá', 'historie:', 'nalezeno', 'hesla:', 'Přenést data z předchozího prohlížeče?', 'Nalezeno:', 'Import probíhá místně — záložky, historie a hesla zůstávají v tomto zařízení.', 'Otevřít import', 'Nelze se připojit ke cloudu', 'Cloud vrátil neplatný JSON', 'Toto není datový soubor Vio', 'Účet není připojen', 'Token nebyl vydán', 'Zadejte adresu souboru WebDAV', 'V cloudu zatím není žádný soubor — klikněte na „Uložit“', 'Cloud odpověděl HTTP', 'Prázdný soubor', 'Vyberte cloud', 'OAuth je potřeba pouze pro Google Drive a Dropbox', 'Zadejte šifrovací heslo (alespoň 4 znaky)', 'Otevírání přihlašovací stránky…', 'Čekání na schválení v prohlížeči…', 'Přihlášení zrušeno', 'Účet připojen', 'Cloud připojen', 'Připojení se nezdařilo:', 'Šifrování…', 'Data uložena do cloudu', 'Načítání…', 'Data stažena z cloudu'],
    ro: ['buc.', 'gol', 'Șterge parola pentru', 'Parolă ștearsă', 'Nu s-a putut șterge:', 'Selectează mai întâi o sursă', 'Alege ce dorești să transferi', 'Se importă…', 'necunoscută', 'istoric:', 'găsite', 'parole:', 'Transferi datele din browserul anterior?', 'Găsite:', 'Importul are loc local — marcajele, istoricul și parolele rămân pe acest dispozitiv.', 'Deschide importul', 'Conectarea la cloud a eșuat', 'Cloudul a returnat JSON nevalid', 'Acesta nu este un fișier de date Vio', 'Contul nu este conectat', 'Tokenul nu a fost emis', 'Introdu adresa fișierului WebDAV', 'Nu există încă un fișier în cloud — apasă „Salvează”', 'Cloudul a răspuns HTTP', 'Fișier gol', 'Alege un cloud', 'OAuth este necesar doar pentru Google Drive și Dropbox', 'Alege o parolă de criptare (minimum 4 caractere)', 'Se deschide pagina de autentificare…', 'Se așteaptă aprobarea în browser…', 'Autentificare anulată', 'Cont conectat', 'Cloud conectat', 'Conectarea a eșuat:', 'Se criptează…', 'Date salvate în cloud', 'Se citește…', 'Date descărcate din cloud'],
    el: ['στοιχεία', 'κενό', 'Διαγραφή κωδικού για', 'Ο κωδικός διαγράφηκε', 'Δεν ήταν δυνατή η διαγραφή:', 'Επιλέξτε πρώτα μια πηγή', 'Επιλέξτε τι θα μεταφερθεί', 'Γίνεται εισαγωγή…', 'άγνωστη', 'ιστορικό:', 'βρέθηκαν', 'κωδικοί:', 'Μεταφορά δεδομένων από το προηγούμενο πρόγραμμα περιήγησης;', 'Βρέθηκαν:', 'Η εισαγωγή γίνεται τοπικά — οι σελιδοδείκτες, το ιστορικό και οι κωδικοί παραμένουν σε αυτή τη συσκευή.', 'Άνοιγμα εισαγωγής', 'Δεν υπάρχει σύνδεση με το cloud', 'Το cloud επέστρεψε μη έγκυρο JSON', 'Αυτό δεν είναι αρχείο δεδομένων Vio', 'Ο λογαριασμός δεν είναι συνδεδεμένος', 'Δεν εκδόθηκε διακριτικό', 'Ορίστε τη διεύθυνση αρχείου WebDAV', 'Δεν υπάρχει ακόμη αρχείο στο cloud — πατήστε «Αποθήκευση»', 'Το cloud απάντησε HTTP', 'Κενό αρχείο', 'Επιλέξτε cloud', 'Το OAuth απαιτείται μόνο για Google Drive και Dropbox', 'Ορίστε κωδικό κρυπτογράφησης (τουλάχιστον 4 χαρακτήρες)', 'Άνοιγμα σελίδας σύνδεσης…', 'Αναμονή έγκρισης στο πρόγραμμα περιήγησης…', 'Η σύνδεση ακυρώθηκε', 'Ο λογαριασμός συνδέθηκε', 'Το cloud συνδέθηκε', 'Αποτυχία σύνδεσης:', 'Κρυπτογράφηση…', 'Τα δεδομένα αποθηκεύτηκαν στο cloud', 'Ανάγνωση…', 'Τα δεδομένα λήφθηκαν από το cloud'],
    be: ['шт.', 'пуста', 'Выдаліць пароль для', 'Пароль выдалены', 'Не ўдалося выдаліць:', 'Спачатку выберыце крыніцу', 'Адзначце, што перанесці', 'Імпартую…', 'невядомая', 'гісторыя:', 'знойдзена', 'паролі:', 'Перанесці даныя з папярэдняга браўзера?', 'Знойдзена:', 'Імпарт адбываецца лакальна — закладкі, гісторыя і паролі застануцца на гэтай прыладзе.', 'Адкрыць імпарт', 'Няма сувязі з воблакам', 'Воблака вярнула не JSON', 'Гэта не файл даных Vio', 'Уліковы запіс не падключаны', 'Токен не атрыманы', 'Укажыце адрас файла WebDAV', 'У воблаку пакуль няма файла — націсніце «Захаваць»', 'Воблака адказала HTTP', 'Пусты файл', 'Выберыце воблака', 'OAuth патрэбны толькі для Google Drive і Dropbox', 'Прыдумайце пароль шыфравання (4+ сімвалы)', 'Адкрываю старонку ўваходу…', 'Чакаю дазволу ў браўзеры…', 'Уваход перапынены', 'Уліковы запіс падключаны', 'Воблака падключана', 'Не ўдалося падключыцца:', 'Шыфрую…', 'Даныя захаваны ў воблака', 'Чытаю…', 'Даныя загружаны з воблака'],
    kk: ['дана', 'бос', 'Құпиясөзді жою:', 'Құпиясөз жойылды', 'Жою мүмкін болмады:', 'Алдымен дереккөзді таңдаңыз', 'Нені тасымалдау керегін таңдаңыз', 'Импортталуда…', 'белгісіз', 'тарих:', 'табылды', 'құпиясөздер:', 'Алдыңғы браузерден деректер тасымалдансын ба?', 'Табылды:', 'Импорт жергілікті түрде орындалады — бетбелгілер, тарих және құпиясөздер осы құрылғыда қалады.', 'Импортты ашу', 'Бұлтпен байланыс жоқ', 'Бұлт жарамсыз JSON қайтарды', 'Бұл Vio деректер файлы емес', 'Тіркелгі қосылмаған', 'Токен берілмеді', 'WebDAV файл мекенжайын көрсетіңіз', 'Бұлтта файл әлі жоқ — «Сақтау» түймесін басыңыз', 'Бұлт HTTP жауабын қайтарды', 'Бос файл', 'Бұлтты таңдаңыз', 'OAuth тек Google Drive және Dropbox үшін қажет', 'Шифрлау құпиясөзін ойлап табыңыз (кемінде 4 таңба)', 'Кіру беті ашылуда…', 'Браузерде рұқсат күтілуде…', 'Кіру тоқтатылды', 'Тіркелгі қосылды', 'Бұлт қосылды', 'Қосу мүмкін болмады:', 'Шифрлануда…', 'Деректер бұлтқа сақталды', 'Оқылуда…', 'Деректер бұлттан жүктелді'],
    ar: ['عناصر', 'فارغ', 'حذف كلمة المرور لـ', 'تم حذف كلمة المرور', 'تعذر الحذف:', 'اختر مصدرًا أولًا', 'اختر ما تريد نقله', 'جارٍ الاستيراد…', 'غير معروف', 'السجل:', 'تم العثور على', 'كلمات المرور:', 'هل تريد نقل البيانات من المتصفح السابق؟', 'تم العثور على:', 'يتم الاستيراد محليًا — تبقى الإشارات المرجعية والسجل وكلمات المرور على هذا الجهاز.', 'فتح الاستيراد', 'تعذر الاتصال بالسحابة', 'أعادت السحابة بيانات JSON غير صالحة', 'هذا ليس ملف بيانات Vio', 'الحساب غير متصل', 'لم يتم إصدار رمز وصول', 'أدخل عنوان ملف WebDAV', 'لا يوجد ملف في السحابة بعد — اضغط «حفظ»', 'أجابت السحابة HTTP', 'ملف فارغ', 'اختر خدمة سحابية', 'يلزم OAuth فقط لـ Google Drive وDropbox', 'أنشئ كلمة مرور للتشفير (4 أحرف أو أكثر)', 'جارٍ فتح صفحة تسجيل الدخول…', 'بانتظار الموافقة في المتصفح…', 'تم إلغاء تسجيل الدخول', 'تم توصيل الحساب', 'تم توصيل السحابة', 'تعذر الاتصال:', 'جارٍ التشفير…', 'تم حفظ البيانات في السحابة', 'جارٍ القراءة…', 'تم تنزيل البيانات من السحابة'],
    he: ['פריטים', 'ריק', 'מחיקת הסיסמה עבור', 'הסיסמה נמחקה', 'לא ניתן למחוק:', 'יש לבחור מקור תחילה', 'יש לבחור מה להעביר', 'מייבא…', 'לא ידוע', 'היסטוריה:', 'נמצאו', 'סיסמאות:', 'להעביר נתונים מהדפדפן הקודם?', 'נמצא:', 'הייבוא מתבצע מקומית — הסימניות, ההיסטוריה והסיסמאות נשארות במכשיר הזה.', 'פתיחת הייבוא', 'אין חיבור לענן', 'הענן החזיר JSON לא תקין', 'זה אינו קובץ נתונים של Vio', 'החשבון אינו מחובר', 'לא התקבל אסימון', 'יש להזין את כתובת קובץ ה-WebDAV', 'עדיין אין קובץ בענן — יש ללחוץ על „שמירה”', 'הענן השיב HTTP', 'קובץ ריק', 'יש לבחור שירות ענן', 'OAuth נדרש רק עבור Google Drive ו-Dropbox', 'יש לבחור סיסמת הצפנה (4 תווים ומעלה)', 'פותח את דף הכניסה…', 'ממתין לאישור בדפדפן…', 'הכניסה בוטלה', 'החשבון מחובר', 'הענן מחובר', 'החיבור נכשל:', 'מצפין…', 'הנתונים נשמרו בענן', 'קורא…', 'הנתונים הורדו מהענן'],
    zh: ['项', '空', '删除此项的密码：', '密码已删除', '无法删除：', '请先选择来源', '选择要迁移的内容', '正在导入…', '未知', '历史记录：', '找到', '密码：', '要从旧浏览器迁移数据吗？', '找到：', '导入在本地进行——书签、历史记录和密码都会保留在此设备上。', '打开导入页面', '无法连接到云端', '云端返回了无效的 JSON', '这不是 Vio 数据文件', '账号未连接', '未能获取令牌', '请输入 WebDAV 文件地址', '云端尚无文件——请点击“保存”', '云端返回 HTTP', '空文件', '请选择云服务', 'OAuth 仅用于 Google Drive 和 Dropbox', '设置加密密码（至少 4 个字符）', '正在打开登录页面…', '正在等待浏览器授权…', '登录已取消', '账号已连接', '云端已连接', '连接失败：', '正在加密…', '数据已保存到云端', '正在读取…', '已从云端下载数据'],
    ja: ['件', '空', 'パスワードを削除:', 'パスワードを削除しました', '削除できませんでした:', '先にインポート元を選択してください', '移行する項目を選択してください', 'インポート中…', '不明', '履歴:', '件見つかりました', 'パスワード:', '以前のブラウザーからデータを移行しますか？', '検出:', 'インポートはローカルで実行されます。ブックマーク、履歴、パスワードはこのデバイスに保存されます。', 'インポートを開く', 'クラウドに接続できません', 'クラウドから無効な JSON が返されました', 'Vio のデータファイルではありません', 'アカウントが接続されていません', 'トークンを取得できませんでした', 'WebDAV ファイルのアドレスを入力してください', 'クラウドにファイルがありません。「保存」を押してください', 'クラウドから HTTP 応答がありました', '空のファイル', 'クラウドを選択してください', 'OAuth は Google Drive と Dropbox のみ必要です', '暗号化パスワードを設定してください（4 文字以上）', 'ログインページを開いています…', 'ブラウザーでの許可を待っています…', 'ログインが中断されました', 'アカウントを接続しました', 'クラウドを接続しました', '接続できませんでした:', '暗号化中…', 'データをクラウドに保存しました', '読み込み中…', 'クラウドからデータをダウンロードしました'],
    ko: ['개', '비어 있음', '다음의 비밀번호 삭제:', '비밀번호가 삭제되었습니다', '삭제하지 못했습니다:', '먼저 가져올 위치를 선택하세요', '가져올 항목을 선택하세요', '가져오는 중…', '알 수 없음', '방문 기록:', '개 찾음', '비밀번호:', '이전 브라우저에서 데이터를 가져올까요?', '찾음:', '가져오기는 로컬에서 진행됩니다. 북마크, 방문 기록, 비밀번호는 이 기기에만 저장됩니다.', '가져오기 열기', '클라우드에 연결할 수 없습니다', '클라우드에서 잘못된 JSON을 반환했습니다', 'Vio 데이터 파일이 아닙니다', '계정이 연결되지 않았습니다', '토큰을 발급받지 못했습니다', 'WebDAV 파일 주소를 입력하세요', '클라우드에 파일이 없습니다. “저장”을 누르세요', '클라우드 HTTP 응답:', '빈 파일', '클라우드를 선택하세요', 'OAuth는 Google Drive와 Dropbox에만 필요합니다', '암호화 비밀번호를 설정하세요(4자 이상)', '로그인 페이지 여는 중…', '브라우저에서 승인을 기다리는 중…', '로그인이 취소되었습니다', '계정이 연결되었습니다', '클라우드가 연결되었습니다', '연결하지 못했습니다:', '암호화 중…', '클라우드에 데이터를 저장했습니다', '읽는 중…', '클라우드에서 데이터를 다운로드했습니다']
  }
  Object.keys(TRANSFER_UI_VALUES).forEach(function (L) {
    var values = TRANSFER_UI_VALUES[L]
    if (values.length !== TRANSFER_UI_KEYS.length) throw new Error('Transfer translation count mismatch for ' + L)
    var transferMap = {}
    TRANSFER_UI_KEYS.forEach(function (key, i) { transferMap[key] = values[i] })
    FEATURE_DICT[L] = Object.assign({}, FEATURE_DICT[L] || {}, transferMap)
  })
  Object.keys(FEATURE_DICT).forEach(function (L) {
    var langMap = FEATURE_DICT[L]
    langMap[SUSPEND_NOTICE] = langMap['Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.']
    delete langMap['Вкладку выгружено из памяти. При открытии сайт загрузится заново; несохранённые данные могут потеряться.']
  })

  var curLang = ''
  var map = null
  var re = null
  var oldMap = null
  var oldRe = null
  /* оригиналы: textNode -> русский текст, element -> {attr: русский} */
  var textSrc = (typeof WeakMap !== 'undefined') ? new WeakMap() : null
  var attrSrc = (typeof WeakMap !== 'undefined') ? new WeakMap() : null
  var featureDictMerged = false

  function dict () {
    try {
      var d = window.I18N_DICT || {}
      if (!featureDictMerged) {
        Object.keys(FEATURE_DICT).forEach(function (L) {
          d[L] = Object.assign({}, d[L] || {}, FEATURE_DICT[L])
        })
        featureDictMerged = true
      }
      return d
    } catch (e) { return {} }
  }

  function lang () {
    try {
      var s = (typeof Store !== 'undefined' && Store.state && Store.state.settings) || {}
      if (s.lang && s.lang !== 'auto' && dict()[s.lang]) return s.lang
    } catch (e) {}
    try {
      if (typeof Region !== 'undefined' && Region.get) {
        var r = Region.get()
        if (r && dict()[r.lang]) return r.lang
      }
    } catch (e) {}
    return 'ru'
  }

  function escRe (s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function ensure () {
    var L = lang()
    if (L === curLang) return
    oldMap = map
    oldRe = re
    curLang = L
    try {
      if (document.documentElement) {
        document.documentElement.lang = L
        /* RTL для арабского и иврита */
        document.documentElement.dir = (L === 'ar' || L === 'he') ? 'rtl' : 'ltr'
      }
    } catch (e) {}
    if (L === 'ru' || !dict()[L]) { map = null; re = null; return }
    map = dict()[L]
    var ks = Object.keys(map).sort(function (a, b) { return b.length - a.length })
    try {
      re = new RegExp(ks.map(function (k) { return NOT_BEFORE + escRe(k) + NOT_AFTER }).join('|'), 'gu')
    } catch (e) {
      try { re = new RegExp(ks.map(escRe).join('|'), 'g') } catch (e2) { re = null }
    }
  }

  function hasOwn (o, k) {
    return Object.prototype.hasOwnProperty.call(o, k)
  }

  /* перевод строки: точное совпадение, иначе замена целых слов/фраз */
  function trWith (str, m, r) {
    if (str == null || !r || !m) return str
    var s = String(str)
    if (!s || !CYR.test(s)) return s
    if (hasOwn(m, s)) return m[s]
    return s.replace(r, function (x) { return hasOwn(m, x) ? m[x] : x })
  }
  function tr (str) { return trWith(str, map, re) }

  function trTextWith (s, m, r) {
    if (s == null || !r || !m) return s
    var t = String(s)
    if (!t || !CYR.test(t)) return t
    var mm = /^(\s*)([\s\S]*?)(\s*)$/.exec(t)
    var core = mm[2]
    if (core && hasOwn(m, core)) return mm[1] + m[core] + mm[3]
    return t.replace(r, function (x) { return hasOwn(m, x) ? m[x] : x })
  }
  function trText (s) { return trTextWith(s, map, re) }

  /* значение уже переведено из src (текущим или предыдущим языком)? */
  function isRendered (v, src) {
    if (v === src) return true
    if (v === trText(src)) return true
    if (oldMap && oldRe && v === trTextWith(src, oldMap, oldRe)) return true
    return false
  }
  function isRenderedAttr (v, src) {
    if (v === src) return true
    if (v === tr(src)) return true
    if (oldMap && oldRe && v === trWith(src, oldMap, oldRe)) return true
    return false
  }

  function skipEl (el) {
    if (!el || el.nodeType !== 1) return false
    if (SKIP_TAGS[el.tagName]) return true
    try { if (el.closest && el.closest(SKIP_SEL)) return true } catch (e) {}
    return false
  }

  function translateTextNode (node) {
    try {
      var v = node.nodeValue
      if (v == null) return
      var src = v
      if (textSrc) {
        if (!textSrc.has(node)) {
          if (CYR.test(v)) { try { textSrc.set(node, v) } catch (e) {} }
        } else {
          src = textSrc.get(node)
          if (!isRendered(v, src)) {
            /* содержимое сменилось (новый заголовок вкладки и т.п.) — новый оригинал */
            src = v
            try { textSrc.set(node, v) } catch (e) {}
          }
        }
      }
      var out = trText(src)
      if (out !== v) node.nodeValue = out
    } catch (e) {}
  }

  function translateAttr (el, name) {
    try {
      if (!el.hasAttribute || !el.hasAttribute(name)) return
      var v = el.getAttribute(name)
      if (v == null) return
      var src = v
      if (attrSrc) {
        var rec = attrSrc.get(el)
        if (!rec) {
          rec = {}
          try { attrSrc.set(el, rec) } catch (e) {}
        }
        if (!(name in rec)) {
          if (CYR.test(v)) rec[name] = v
        } else {
          src = rec[name]
          if (!isRenderedAttr(v, src)) { src = v; rec[name] = v }
        }
      }
      var out = tr(src)
      if (out !== v) el.setAttribute(name, out)
    } catch (e) {}
  }

  function translateNode (node) {
    if (!node) return
    if (node.nodeType === 3) { translateTextNode(node); return }
    if (node.nodeType !== 1) return
    if (skipEl(node)) return
    var i, k
    for (i = 0; i < ATTRS.length; i++) translateAttr(node, ATTRS[i])
    var kids = node.childNodes
    for (k = 0; k < kids.length; k++) translateNode(kids[k])
  }

  function apply (root) {
    ensure()
    /* re==null бывает и при ru: тогда восстанавливаем оригиналы из сохранённых */
    if (!re && !oldMap) return
    translateNode(root || document.body)
  }

  function refresh () {
    /* перевод всегда идёт из сохранённых оригиналов — смена языка срабатывает сразу */
    apply(document.body)
  }

  function init () {
    ensure()
    apply(document.body)
    try {
      var mo = new MutationObserver(function (muts) {
        ensure()
        if (!re && !oldMap) return
        for (var i = 0; i < muts.length; i++) {
          var mu = muts[i]
          if (mu.type === 'childList') {
            for (var j = 0; j < mu.addedNodes.length; j++) translateNode(mu.addedNodes[j])
          } else if (mu.type === 'attributes') {
            if (ATTRS.indexOf(mu.attributeName) >= 0) translateAttr(mu.target, mu.attributeName)
          } else if (mu.type === 'characterData') {
            translateTextNode(mu.target)
          }
        }
      })
      mo.observe(document.documentElement, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ATTRS,
        characterData: true
      })
    } catch (e) {}
    /* язык могли выбрать в настройках — пересчитать при возврате на страницу */
    try {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) refresh()
      })
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  window.I18n = { lang: lang, t: tr, apply: apply, refresh: refresh }
})()
