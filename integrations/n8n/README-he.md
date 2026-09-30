# YouLeap FinOps — סלאק מפעיל את הרוטינה בענן

תהליך לייבוא ל-n8n, המותאם לערוץ `C0C5HBL3USJ` ולרוטינה
`trig_01AzDhXfxgA6VciGcWeLWSoc`.

הודעה חדשה → סינון → רישום ייחודי ב-PostgreSQL → הפעלת API →
שמירת קישור לסשן. Claude משתמש בחיבורי Umbrella ו-Slack שכבר הוגדרו
ברוטינה ומפרסם את התשובה בשרשור. n8n אינו מתחבר ל-Umbrella ואינו מייצר תשובה.

התהליך אינו מותקן או פעיל עדיין. נבדקו מבנה JSON, קוד הסינון, סיווג תשובת
ה-API ושאילתות מניעת כפילויות. ייבוא וריצת קצה לקצה במערכת שלכם טרם נבדקו.

## 1. הגדרת הרוטינה

1. פתחי את YouLeap FinOps — Slack בממשק Claude Routines.
2. Edit → Select a trigger → Add another trigger → API.
3. צרי טוקן ושמרי אותו ב-n8n Credentials בלבד. זהו טוקן ההפעלה של
   הרוטינה, לא Anthropic API key ולא טוקן Umbrella.
4. ודאי שה-URL שמוצג זהה לכתובת ב-node Fire Claude routine;
   אם לא, העתיקי את הכתובת המלאה מהממשק.
5. החליפי את ההנחיות ב-`routine-prompt-he.md`. ההנחיות החדשות
   מטפלות בהודעה שהתקבלה ב-routine-fire-payload בלבד.
6. ודאי ש-Slack ו-Umbrella Cost עדיין מחוברים.
7. אחרי בדיקת קצה לקצה מוצלחת, הסירי את Schedule trigger השעתי.
   השאירי את הרוטינה זמינה להפעלות API. אין צורך בשתי רוטינות.

## 2. PostgreSQL למניעת כפילויות

בחרו בסיס נתונים נפרד לאוטומציות או schema ייעודי בבסיס נתונים שאתם
מנהלים. אין להשתמש או לשנות טבלאות פנימיות של n8n.
הריצו פעם אחת את `setup.sql` ובחרו אותו Postgres credential בשני nodes:
`Claim message` ו-`Record dispatch result`.

מפתח ייחודי channel:message_ts מונע מאותו אירוע להפעיל API פעמיים,
גם אם Slack שולח אותו מחדש או שתי ריצות n8n מתקיימות במקביל.
טבלת המצב שומרת מזהים וקישורי סשן בלבד, בלי תוכן שאלות ובלי טוקנים.

## 3. Slack App לאירועים

החיבור האישי של Claude ל-Slack נשאר כפי שהוא. לצורך האירועים של n8n:

1. צרו Slack App ייעודי, או השתמשו באפליקציית n8n קיימת.
   אל תשנו Request URL של אפליקציה המשמשת תהליך אחר.
   מצורף slack-app-manifest.json ליצירה דרך From a manifest;
   יש להחליף בו את Request URL בכתובת ה-webhook שלכם.
2. הגדירו bot scopes: `groups:history`, `groups:read`.
   אין צורך ב-chat:write לתהליך הזה, כי Claude שולח דרך ה-MCP שלו.
3. התקינו את האפליקציה ב-workspace והוסיפו אותה לערוץ הפרטי
   #youleap-finops. אפליקציה שאינה בערוץ לא תקבל אירועים.
4. ב-n8n הגדירו Slack API credential עם Bot Token ו-Signature Secret
   (Signing Secret מ-Basic Information של אותה אפליקציה).
   אל תשאירו את Signature Secret ריק.
5. ב-Slack Event Subscriptions הפעילו אירועים והוסיפו bot event
   `message.groups` לקבלת הודעות בערוצים פרטיים, כולל הודעות בשרשורים.
6. העתיקו את Production Webhook URL מ-Slack message node אל Request URL.
   לצורך אימות ראשוני ניתן להשתמש ב-Test URL בזמן Listen for test event;
   לפני הפעלה החליפו בחזרה ל-Production URL ואמתו שוב.
   Slack Trigger מטפל ב-url_verification ובבדיקת החתימה.

## 4. ייבוא והגדרת Credentials

ב-n8n: Import from File → `youleap-finops-slack-to-claude.json`.
הקובץ אינו מכיל credentials או secrets.

| Node | חיבור נדרש |
|---|---|
| Slack message | Slack API, כולל Bot Token ו-Signature Secret |
| Claim message | PostgreSQL לבסיס הנתונים שהוכן |
| Fire Claude routine | HTTP Header Auth: שם Authorization, ערך Bearer ואחריו טוקן הרוטינה |
| Record dispatch result | אותו PostgreSQL |

בחירת HTTP Header Auth נעשית בממשק Credentials; לא להדביק טוקן
בפרמטרי node, בקוד, בקובץ JSON או בריפו.

בגרסה שאינה מציעה את גרסת Postgres node 2.6 או HTTP Request 4.2,
יש לעדכן n8n או לשחזר את ה-node לפי הפרמטרים בקובץ. זו אינה בדיקת
תאימות לכל גרסאות n8n.

## 5. בדיקת קצה לקצה

1. בחרו credentials, הכינו את טבלת המצב, ואמתו את Slack Request URL.
2. הפעילו את ה-workflow, ואז שלחו שאלה בערוץ.
3. ודאו ששורת dispatch היא accepted וש-session_url מצביע לריצה חדשה.
4. פתחו את הריצה ובדקו שיש תשובת Umbrella בשרשור המקורי.
   accepted מוכיח שהסשן התחיל בלבד.
5. ודאו שתשובת Claude כוללת את החתימה ואת finops-event;
   התשובה אינה אמורה להפעיל רוטינה נוספת.
6. שלחו שאלה נוספת בתוך השרשור וודאו שהיא מטופלת כאירוע חדש.
7. רק אחרי הצלחה הסירו את הטריגר השעתי ובדקו הפעלה נוספת דרך API בלבד.

תשובה מתחילה לאחר הפעלת הסשן ומסתיימת לפי זמן העבודה של Claude;
לא מובטח מענה בתוך דקה.

## טיפול בכשלים

- אין Retry אוטומטי על POST ההפעלה: timeout עלול לקרות לאחר שהסשן כבר
  התחיל, וניסיון חוזר עלול ליצור תשובה כפולה.
- 4xx נשמר rejected; שגיאת רשת, 5xx או תשובה לא צפויה נשמרות uncertain.
- תוצאה לא מאושרת גורמת לכישלון execution ב-n8n לאחר שמירת הסטטוס.
  ניתן לחבר Error Workflow קיים להתראה; לא נוספה שליחת הודעה חדשה כאן.
- pending שנשאר לאחר עצירת n8n מחייב בדיקה ידנית.
- אחרי אימות שלא נוצר סשן ואין תשובה ב-Slack, ניתן לאפס אירוע באמצעות
  מחיקת השורה המסוימת בטבלת האוטומציה בלבד, ואז לשלוח שוב את הקלט.
  אין למחוק accepted כדי לנסות שוב בלי לבדוק את הסשן.
- שאלה שכבר הופעלה אך Claude נכשל בטיפול בה: שלחו הודעת המשך חדשה
  בשרשור לאחר התיקון. אין polling או מעקב אוטומטי אחרי השלמת הסשן.

Claude מגביל API fires יחד עם Run now ל-30 לשעה לרוטינה, וכן 100 API
fires לשעה לחשבון. לכן הקובץ אינו מתיימר לאפשר נפח בלתי מוגבל.
הסינון מאפשר כרגע הודעות של Sarit, Eli ו-Morad בלבד. כדי להוסיף אדם,
עדכנו allowedUsers ב-node ובהנחיות הרוטינה.

הסינון מתעלם מהצטרפות, עריכה, מחיקה, בוטים, טקסט ריק וחתימת הסוכן.
טקסט של שיתוף קובץ יכול להפעיל ריצה, אך n8n אינו מוריד קבצים.
הנחיות הרוטינה דורשות ממנה לוודא שההודעה אכן מתייחסת ל-FinOps.

## מקורות

- https://code.claude.com/docs/en/routines
- https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/
- https://docs.n8n.io/integrations/builtin/credentials/slack/
- https://api.slack.com/events/message.groups
