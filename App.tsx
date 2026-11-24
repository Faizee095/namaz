import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants, { AppOwnership } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
type Prayer = { name: PrayerName; arabic: string; time: Date; endTime: Date; icon: string };
type CompletedPrayers = Record<string, boolean>;
type PrayerReminderPreferences = Record<PrayerName, boolean>;
type PrayerTimeAdjustments = Record<PrayerName, number>;
type MosqueSchedule = { mosqueName: string; times: Record<PrayerName, string> };
type MonthlyTimetableDay = { date: Date; prayers: Prayer[] };
type Language = 'en' | 'hi';

const COPY = {
  en: {
    endsBy: 'Ends by',
    reminderOnLabel: (name: string) => `Turn ${name} reminders off`,
    reminderOffLabel: (name: string) => `Turn ${name} reminders on`,
    noPrayerRemindersSelected: 'No prayers selected',
    selectPrayerReminder: 'Choose at least one prayer below to get reminders.',
    qibla: 'QIBLA DIRECTION',
    qiblaBearingLabel: 'Bearing from north',
    qiblaCompassHint: 'Point the top of your phone toward the arrow',
    adjustTimes: 'Adjust times',
    adjustPrayerTimes: 'Prayer time adjustments',
    adjustmentHelp: 'Add or subtract minutes from calculated times.',
    resetAdjustments: 'Reset to calculated times',
    minute: 'min',
    invalidAdjustment: 'That change would make a prayer window overlap its next boundary. Choose a smaller adjustment.',
    decreaseAdjustmentLabel: (name: string) => `Decrease ${name} adjustment by one minute`,
    increaseAdjustmentLabel: (name: string) => `Increase ${name} adjustment by one minute`,
    mosqueSchedule: 'LOCAL JAMA’AT SCHEDULE',
    editMosqueSchedule: 'Set mosque times',
    editSchedule: 'Edit schedule',
    mosqueScheduleHint: 'Add the congregation times used at your local mosque.',
    calculatedTimesNote: 'These are mosque Jama’at times; calculated prayer times and reminders stay separate.',
    mosqueName: 'Mosque name',
    jamaatTimes: 'Jama’at times',
    time24HourHint: 'Enter times in 24-hour format (HH:MM).',
    invalidMosqueTime: 'Enter each time as HH:MM, from 00:00 to 23:59.',
    clearMosqueSchedule: 'Clear mosque schedule',
    notSet: 'Not set',
    save: 'Save',
    monthlyTimetable: 'Monthly timetable',
    shareTimetable: 'Share timetable',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    companion: 'YOUR DAILY COMPANION', launchSubtitle: 'Prayer times, wherever you are', developed: 'DEVELOPED BY',
    finding: 'Finding your location', preparing: "Preparing today's prayer times", current: 'CURRENT LOCATION',
    unavailable: 'Location unavailable', update: 'UPDATE', chooseCity: 'Choose another city', next: 'NEXT PRAYER',
    until: 'until prayer time', calculatedStart: 'CALCULATED PRAYER-START TIME', mosqueNote: 'Mosque Azan/Jama’at times may follow a different local schedule.', today: "Today's prayers", done: 'done', remindersOn: 'Reminders enabled',
    remindersOff: 'Get prayer reminders', scheduled: 'Daily notifications are scheduled', neverMiss: 'Never miss a prayer time',
    selectedTimes: 'Prayer times for your selected location', choose: 'Choose a city', anywhere: 'View prayer times anywhere',
    searchPlaceholder: 'Search city or country', useLocation: 'Use this location', quick: 'QUICK LOCATIONS', completed: 'DONE',
    wellDone: 'Well done', allDone: 'You completed all five prayers for today.', continue: 'Continue',
    notificationsOff: 'Notifications are off', enableNotifications: 'Enable notifications in your device settings to receive reminders.',
    remindersFailed: 'Could not schedule reminders', remindersFailedBody: 'Notification permission or exact alarms may be blocked. Enable notifications and Alarms & reminders for Azan in system settings, then try again.',
    locationNotFound: 'Location not found', tryCity: 'Try a city and country, such as London, United Kingdom.',
    searchFailed: 'Could not search location', checkInternet: 'Check your internet connection and try again.',
    updating: 'Updating location...', permission: 'Location permission is needed', updated: 'Prayer times updated', failed: 'Could not update location',
    prayerBody: (name: string) => `It is time for ${name}.`, prayerTitle: (name: string) => `${name} prayer`,
  },
  hi: {
    adjustTimes: 'समय बदलें',
    adjustPrayerTimes: 'नमाज़ के समय में बदलाव',
    adjustmentHelp: 'हिसाब किए गए समय में मिनट जोड़ें या घटाएँ।',
    resetAdjustments: 'हिसाब किए गए समय पर लौटें',
    minute: 'मिनट',
    invalidAdjustment: 'इस बदलाव से नमाज़ के समय की सीमा आगे की नमाज़ से टकराएगी। कम बदलाव चुनें।',
    decreaseAdjustmentLabel: (name: string) => `${name} का समय एक मिनट घटाएँ`,
    increaseAdjustmentLabel: (name: string) => `${name} का समय एक मिनट बढ़ाएँ`,
    mosqueSchedule: 'स्थानीय जमाअत का समय',
    editMosqueSchedule: 'मस्जिद का समय जोड़ें',
    editSchedule: 'समय बदलें',
    mosqueScheduleHint: 'अपनी स्थानीय मस्जिद के जमाअत का समय जोड़ें।',
    calculatedTimesNote: 'ये मस्जिद के जमाअत के समय हैं; हिसाब किए गए नमाज़ के समय और रिमाइंडर अलग रहेंगे।',
    mosqueName: 'मस्जिद का नाम',
    jamaatTimes: 'जमाअत का समय',
    time24HourHint: 'समय 24 घंटे के प्रारूप में लिखें (HH:MM)।',
    invalidMosqueTime: 'हर समय HH:MM में लिखें, 00:00 से 23:59 तक।',
    clearMosqueSchedule: 'मस्जिद का समय हटाएँ',
    notSet: 'नहीं दिया गया',
    save: 'सहेजें',
    monthlyTimetable: 'महीने का नमाज़ समय',
    shareTimetable: 'समय साझा करें',
    previousMonth: 'पिछला महीना',
    nextMonth: 'अगला महीना',
    qibla: 'क़िबला दिशा',
    qiblaBearingLabel: 'उत्तर से दिशा',
    qiblaCompassHint: 'फ़ोन का ऊपरी हिस्सा तीर की दिशा में रखें',
    reminderOnLabel: (name: string) => `${name} reminders बंद करें`,
    reminderOffLabel: (name: string) => `${name} reminders चालू करें`,
    noPrayerRemindersSelected: 'कोई नमाज़ चुनी नहीं',
    selectPrayerReminder: 'रिमाइंडर पाने के लिए नीचे कम से एक नमाज़ चुनें।',
    endsBy: 'आख़िरी समय',
    companion: 'आपका रोज़ाना साथी', launchSubtitle: 'जहाँ भी हों, नमाज़ का समय', developed: 'द्वारा विकसित',
    finding: 'आपकी लोकेशन खोज रहे हैं', preparing: 'आज के नमाज़ के समय तैयार हो रहे हैं', current: 'वर्तमान लोकेशन',
    unavailable: 'लोकेशन उपलब्ध नहीं', update: 'अपडेट', chooseCity: 'दूसरा शहर चुनें', next: 'अगली नमाज़',
    until: 'नमाज़ तक बाकी समय', calculatedStart: 'नमाज़ शुरू होने का हिसाब किया गया समय', mosqueNote: 'मस्जिद का अज़ान/जमाअत समय अलग स्थानीय शेड्यूल हो सकता है।', today: 'आज की नमाज़', done: 'पूरी', remindersOn: 'रिमाइंडर चालू हैं',
    remindersOff: 'नमाज़ के रिमाइंडर पाएं', scheduled: 'रोज़ाना नोटिफिकेशन शेड्यूल हैं', neverMiss: 'कोई नमाज़ न छूटे',
    selectedTimes: 'चुनी गई लोकेशन के नमाज़ के समय', choose: 'शहर चुनें', anywhere: 'कहीं भी नमाज़ का समय देखें',
    searchPlaceholder: 'शहर या देश खोजें', useLocation: 'यह लोकेशन चुनें', quick: 'जल्दी चुनें', completed: 'पूरा',
    wellDone: 'बहुत अच्छा', allDone: 'आज की पाँचों नमाज़ पूरी हो गईं।', continue: 'जारी रखें',
    notificationsOff: 'नोटिफिकेशन बंद हैं', enableNotifications: 'रिमाइंडर पाने के लिए डिवाइस सेटिंग्स में नोटिफिकेशन चालू करें।',
    remindersFailed: 'रिमाइंडर सेट नहीं हो सके', remindersFailedBody: 'नोटिफिकेशन या सटीक अलार्म बंद हो सकते हैं। सिस्टम सेटिंग्स में Azan के नोटिफिकेशन और Alarms & reminders चालू करके फिर कोशिश करें।',
    locationNotFound: 'लोकेशन नहीं मिली', tryCity: 'शहर और देश लिखें, जैसे London, United Kingdom।',
    searchFailed: 'लोकेशन खोज नहीं सके', checkInternet: 'इंटरनेट कनेक्शन जाँचकर फिर कोशिश करें।',
    updating: 'लोकेशन अपडेट हो रही है...', permission: 'लोकेशन की अनुमति ज़रूरी है', updated: 'नमाज़ के समय अपडेट हो गए', failed: 'लोकेशन अपडेट नहीं हो सकी',
    prayerBody: (name: string) => `${name} की नमाज़ का समय हो गया है।`, prayerTitle: (name: string) => `${name} की नमाज़`,
  },
} as const;

const FALLBACK_COORDINATES = { latitude: 26.1209, longitude: 85.3647 };
const REMINDERS_STORAGE_KEY = 'azan-reminders-enabled';
const PRAYER_REMINDERS_STORAGE_KEY = 'azan-prayer-reminder-preferences';
const PRAYER_TIME_ADJUSTMENTS_STORAGE_KEY = 'azan-prayer-time-adjustments';
const MOSQUE_SCHEDULE_STORAGE_KEY = 'azan-mosque-jamaat-schedule';
const NOTIFICATION_CHANNEL_ID = 'azan-reminders-v3';
const REMINDER_DATA_KEY = 'azanReminder';
const REMINDER_DAYS_AHEAD = 8;
const KAABA_COORDINATES = { latitude: 21.4225, longitude: 39.8262 };
const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const DEFAULT_PRAYER_REMINDERS: PrayerReminderPreferences = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};
const DEFAULT_PRAYER_TIME_ADJUSTMENTS: PrayerTimeAdjustments = {
  Fajr: 0,
  Dhuhr: 0,
  Asr: 0,
  Maghrib: 0,
  Isha: 0,
};
const EMPTY_MOSQUE_SCHEDULE: MosqueSchedule = {
  mosqueName: '',
  times: { Fajr: '', Dhuhr: '', Asr: '', Maghrib: '', Isha: '' },
};
const MAX_PRAYER_TIME_ADJUSTMENT_MINUTES = 30;
const notificationSound = Constants.appOwnership === AppOwnership.Expo ? 'default' : 'azan.mp3';
const PRAYER_LABELS = {
  Fajr: { en: 'Fajr', hi: 'फ़ज्र', descriptionEn: 'Dawn', descriptionHi: 'सुबह' },
  Dhuhr: { en: 'Dhuhr', hi: 'ज़ुहर', descriptionEn: 'Noon', descriptionHi: 'दोपहर' },
  Asr: { en: 'Asr', hi: 'असर', descriptionEn: 'Afternoon', descriptionHi: 'शाम से पहले' },
  Maghrib: { en: 'Maghrib', hi: 'मग़रिब', descriptionEn: 'Sunset', descriptionHi: 'सूरज डूबने का समय' },
  Isha: { en: 'Isha', hi: 'ईशा', descriptionEn: 'Night', descriptionHi: 'रात' },
} as const;

function getPrayerLabel(name: string, language: Language) {
  const label = PRAYER_LABELS[name as keyof typeof PRAYER_LABELS];
  return label ? label[language] : name;
}

function getPrayerDescription(name: string, language: Language) {
  const label = PRAYER_LABELS[name as keyof typeof PRAYER_LABELS];
  return label ? (language === 'hi' ? label.descriptionHi : label.descriptionEn) : name;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatCompactTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function normalizeClockTime(value: string) {
  const match = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/.exec(value.trim());
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}

function formatClockTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return formatTime(new Date(2000, 0, 1, hours, minutes));
}

function getQiblaBearing(latitude: number, longitude: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const latitudeRadians = toRadians(latitude);
  const kaabaLatitudeRadians = toRadians(KAABA_COORDINATES.latitude);
  const longitudeDifference = toRadians(KAABA_COORDINATES.longitude - longitude);
  const y = Math.sin(longitudeDifference) * Math.cos(kaabaLatitudeRadians);
  const x = Math.cos(latitudeRadians) * Math.sin(kaabaLatitudeRadians)
    - Math.sin(latitudeRadians) * Math.cos(kaabaLatitudeRadians) * Math.cos(longitudeDifference);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function getPrayers(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  adjustments: PrayerTimeAdjustments = DEFAULT_PRAYER_TIME_ADJUSTMENTS,
): Prayer[] {
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const coordinates = new Coordinates(latitude, longitude);
  const times = new PrayerTimes(coordinates, date, params);
  const fajr = addMinutes(times.fajr, adjustments.Fajr);
  const dhuhr = addMinutes(times.dhuhr, adjustments.Dhuhr);
  const asr = addMinutes(times.asr, adjustments.Asr);
  const maghrib = addMinutes(times.maghrib, adjustments.Maghrib);
  const isha = addMinutes(times.isha, adjustments.Isha);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextFajr = addMinutes(new PrayerTimes(coordinates, nextDate, params).fajr, adjustments.Fajr);

  return [
    { name: 'Fajr', arabic: 'Dawn', time: fajr, endTime: times.sunrise, icon: '01' },
    { name: 'Dhuhr', arabic: 'Noon', time: dhuhr, endTime: asr, icon: '02' },
    { name: 'Asr', arabic: 'Afternoon', time: asr, endTime: maghrib, icon: '03' },
    { name: 'Maghrib', arabic: 'Sunset', time: maghrib, endTime: isha, icon: '04' },
    { name: 'Isha', arabic: 'Night', time: isha, endTime: nextFajr, icon: '05' },
  ];
}

function arePrayerTimeAdjustmentsValid(
  latitude: number,
  longitude: number,
  date: Date,
  adjustments: PrayerTimeAdjustments,
) {
  const checkDate = new Date(date);
  for (let dayOffset = 0; dayOffset < REMINDER_DAYS_AHEAD; dayOffset += 1) {
    const prayers = getPrayers(latitude, longitude, checkDate, adjustments);
    if (prayers.some((prayer) => prayer.time.getTime() >= prayer.endTime.getTime())) return false;
    checkDate.setDate(checkDate.getDate() + 1);
  }
  return true;
}

function notificationsAllowed(permissions: Notifications.NotificationPermissionsStatus) {
  return (
    permissions.granted
    || permissions.status === 'granted'
    || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;

  const channel: Notifications.NotificationChannelInput = {
    name: 'Prayer reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: notificationSound,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  };

  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      ...channel,
      bypassDnd: true,
    });
  } catch {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, channel);
  }
}

async function enablePrayerReminders(
  latitude: number,
  longitude: number,
  language: Language,
  options: {
    promptOnFailure?: boolean;
    prayerPreferences?: PrayerReminderPreferences;
    timeAdjustments?: PrayerTimeAdjustments;
  } = {},
) {
  const copy = COPY[language];
  const promptOnFailure = options.promptOnFailure !== false;
  const prayerPreferences = options.prayerPreferences ?? DEFAULT_PRAYER_REMINDERS;
  const timeAdjustments = options.timeAdjustments ?? DEFAULT_PRAYER_TIME_ADJUSTMENTS;

  if (!PRAYER_NAMES.some((name) => prayerPreferences[name])) {
    if (promptOnFailure) Alert.alert(copy.noPrayerRemindersSelected, copy.selectPrayerReminder);
    return false;
  }

  if (Platform.OS === 'web') {
    if (promptOnFailure) {
      Alert.alert(copy.remindersFailed, copy.remindersFailedBody);
    }
    return false;
  }

  try {
    await ensureNotificationChannel();

    const permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    if (!notificationsAllowed(permissions)) {
      if (promptOnFailure) {
        Alert.alert(copy.notificationsOff, copy.enableNotifications);
      }
      return false;
    }

    await cancelPrayerReminders();

    const now = Date.now();
    let scheduled = 0;
    for (let dayOffset = 0; dayOffset < REMINDER_DAYS_AHEAD; dayOffset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const prayers = getPrayers(latitude, longitude, date, timeAdjustments);

      for (const prayer of prayers) {
        if (!prayerPreferences[prayer.name]) continue;
        if (prayer.time.getTime() <= now + 15000) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: copy.prayerTitle(getPrayerLabel(prayer.name, language)),
            body: copy.prayerBody(getPrayerLabel(prayer.name, language)),
            sound: notificationSound,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { prayer: prayer.name, [REMINDER_DATA_KEY]: true },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: prayer.time,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        });
        scheduled += 1;
      }
    }

    if (scheduled === 0) {
      if (promptOnFailure) {
        Alert.alert(copy.remindersFailed, copy.remindersFailedBody);
      }
      return false;
    }

    return true;
  } catch {
    if (promptOnFailure) {
      Alert.alert(copy.remindersFailed, copy.remindersFailedBody);
    }
    return false;
  }
}

async function cancelPrayerReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.[REMINDER_DATA_KEY] === true)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

export default function App() {
  const [coordinates, setCoordinates] = useState(FALLBACK_COORDINATES);
  const [city, setCity] = useState('Muzaffarpur');
  const [remindersOn, setRemindersOn] = useState(false);
  const [prayerReminderPreferences, setPrayerReminderPreferences] = useState(DEFAULT_PRAYER_REMINDERS);
  const [prayerReminderPreferencesLoaded, setPrayerReminderPreferencesLoaded] = useState(false);
  const [prayerTimeAdjustments, setPrayerTimeAdjustments] = useState(DEFAULT_PRAYER_TIME_ADJUSTMENTS);
  const [prayerTimeAdjustmentsLoaded, setPrayerTimeAdjustmentsLoaded] = useState(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  const [locationLoading, setLocationLoading] = useState(true);
  const [initialLocationLoading, setInitialLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Tap to refresh');
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [timeAdjustmentsOpen, setTimeAdjustmentsOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [mosqueSchedule, setMosqueSchedule] = useState(EMPTY_MOSQUE_SCHEDULE);
  const [mosqueScheduleDraft, setMosqueScheduleDraft] = useState(EMPTY_MOSQUE_SCHEDULE);
  const [mosqueScheduleOpen, setMosqueScheduleOpen] = useState(false);
  const [monthlyTimetableOpen, setMonthlyTimetableOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [completedPrayers, setCompletedPrayers] = useState<CompletedPrayers>({});
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [language, setLanguage] = useState<Language>('en');

  const copy = COPY[language];
  const hasSelectedPrayerReminders = PRAYER_NAMES.some((name) => prayerReminderPreferences[name]);

  useEffect(() => {
    const timer = setTimeout(() => setShowLaunchScreen(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PRAYER_TIME_ADJUSTMENTS_STORAGE_KEY).then((saved) => {
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<PrayerTimeAdjustments>;
      const normalized = Object.fromEntries(
        PRAYER_NAMES.map((name) => {
          const value = parsed[name];
          const adjustment = typeof value === 'number' && Number.isFinite(value)
            ? Math.max(-MAX_PRAYER_TIME_ADJUSTMENT_MINUTES, Math.min(MAX_PRAYER_TIME_ADJUSTMENT_MINUTES, Math.trunc(value)))
            : DEFAULT_PRAYER_TIME_ADJUSTMENTS[name];
          return [name, adjustment];
        }),
      ) as PrayerTimeAdjustments;
      if (!cancelled) setPrayerTimeAdjustments(normalized);
    }).catch(() => {
      if (!cancelled) setPrayerTimeAdjustments(DEFAULT_PRAYER_TIME_ADJUSTMENTS);
    }).finally(() => {
      if (!cancelled) setPrayerTimeAdjustmentsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MOSQUE_SCHEDULE_STORAGE_KEY).then((saved) => {
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<MosqueSchedule>;
      const times = Object.fromEntries(
        PRAYER_NAMES.map((name) => {
          const value = parsed.times?.[name];
          return [name, typeof value === 'string' && normalizeClockTime(value) ? normalizeClockTime(value) : ''];
        }),
      ) as Record<PrayerName, string>;
      if (!cancelled) {
        const loaded = { mosqueName: typeof parsed.mosqueName === 'string' ? parsed.mosqueName : '', times };
        setMosqueSchedule(loaded);
        setMosqueScheduleDraft(loaded);
      }
    }).catch(() => {
      if (!cancelled) {
        setMosqueSchedule(EMPTY_MOSQUE_SCHEDULE);
        setMosqueScheduleDraft(EMPTY_MOSQUE_SCHEDULE);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    Location.watchHeadingAsync((heading) => {
      const direction = heading.trueHeading;
      if (active) setCompassHeading(Number.isFinite(direction) && direction >= 0 ? direction : null);
    }, () => {
      if (active) setCompassHeading(null);
    }).then((watcher) => {
      if (active) subscription = watcher;
      else watcher.remove();
    }).catch(() => {
      if (active) setCompassHeading(null);
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const trackerKey = `azan-prayer-tracker-${getLocalDateKey(now)}`;
    AsyncStorage.getItem(trackerKey).then((saved) => {
      setCompletedPrayers(saved ? JSON.parse(saved) : {});
    }).catch(() => setCompletedPrayers({}));
  }, [getLocalDateKey(now)]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PRAYER_REMINDERS_STORAGE_KEY).then((saved) => {
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<PrayerReminderPreferences>;
      const normalized = Object.fromEntries(
        PRAYER_NAMES.map((name) => [
          name,
          typeof parsed[name] === 'boolean' ? parsed[name] : DEFAULT_PRAYER_REMINDERS[name],
        ]),
      ) as PrayerReminderPreferences;
      if (!cancelled) setPrayerReminderPreferences(normalized);
    }).catch(() => {
      if (!cancelled) setPrayerReminderPreferences(DEFAULT_PRAYER_REMINDERS);
    }).finally(() => {
      if (!cancelled) setPrayerReminderPreferencesLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  async function loadLocation() {
    setLocationLoading(true);
    setLocationError(false);
    setLocationStatus(copy.updating);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== 'granted') {
        setLocationError(true);
        setLocationStatus(copy.permission);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      const places = await Location.reverseGeocodeAsync(location.coords);
      const place = places[0];
      setCity(place?.city || place?.district || 'Your location');
      setLocationStatus(copy.updated);
    } catch {
      setLocationError(true);
      setLocationStatus(copy.failed);
    } finally {
      setLocationLoading(false);
      setInitialLocationLoading(false);
    }
  }

  async function selectLocation(query: string) {
    const search = query.trim();
    if (!search) return;

    setSearchingLocation(true);
    try {
      const places = await Location.geocodeAsync(search);
      const place = places[0];
      if (!place) {
        Alert.alert(copy.locationNotFound, copy.tryCity);
        return;
      }

      setCoordinates({ latitude: place.latitude, longitude: place.longitude });
      setCity(search);
      setLocationError(false);
      setLocationStatus(copy.updated);
      setLocationPickerOpen(false);
      setLocationQuery('');
    } catch {
      Alert.alert(copy.searchFailed, copy.checkInternet);
    } finally {
      setSearchingLocation(false);
    }
  }

  useEffect(() => {
    loadLocation();
  }, []);

  const todayKey = getLocalDateKey(now);
  const prayers = useMemo(() => {
    const [year, month, day] = todayKey.split('-').map(Number);
    return getPrayers(coordinates.latitude, coordinates.longitude, new Date(year, month - 1, day, 12), prayerTimeAdjustments);
  }, [coordinates.latitude, coordinates.longitude, todayKey, prayerTimeAdjustments]);
  const monthlyDays = useMemo<MonthlyTimetableDay[]>(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1, 12);
      return { date, prayers: getPrayers(coordinates.latitude, coordinates.longitude, date, prayerTimeAdjustments) };
    });
  }, [coordinates.latitude, coordinates.longitude, displayMonth, prayerTimeAdjustments]);
  const nextPrayer = prayers.find((prayer) => prayer.time.getTime() > now.getTime()) || prayers[0];
  const minutesUntil = Math.max(0, Math.round((nextPrayer.time.getTime() - now.getTime()) / 60000));
  const countdown = minutesUntil >= 60
    ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
    : `${minutesUntil}m`;
  const dateLabel = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const qiblaBearing = getQiblaBearing(coordinates.latitude, coordinates.longitude);
  const compassRotation = qiblaBearing - (compassHeading ?? 0);
  const monthLabel = displayMonth.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en', { month: 'long', year: 'numeric' });

  async function shareMonthlyTimetable() {
    const locale = language === 'hi' ? 'hi-IN' : 'en';
    const title = `${copy.monthlyTimetable} — ${monthLabel}`;
    const rows = monthlyDays.map(({ date, prayers: dayPrayers }) =>
      `${date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}: ${dayPrayers.map((prayer) => `${getPrayerLabel(prayer.name, language)} ${formatTime(prayer.time)}`).join(' | ')}`,
    );
    try {
      await Share.share({ title, message: [title, city, '', ...rows].join('\n') });
    } catch {
      Alert.alert(copy.monthlyTimetable, copy.shareTimetable);
    }
  }

  useEffect(() => {
    let cancelled = false;

    if (initialLocationLoading || !prayerReminderPreferencesLoaded || !prayerTimeAdjustmentsLoaded) {
      return () => { cancelled = true; };
    }

    AsyncStorage.getItem(REMINDERS_STORAGE_KEY).then(async (saved) => {
      if (cancelled || saved !== 'true') return;
      setRemindersOn(true);
      if (PRAYER_NAMES.some((name) => prayerReminderPreferences[name])) {
        await enablePrayerReminders(coordinates.latitude, coordinates.longitude, language, {
          promptOnFailure: false,
          prayerPreferences: prayerReminderPreferences,
          timeAdjustments: prayerTimeAdjustments,
        });
      } else {
        await cancelPrayerReminders();
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [coordinates.latitude, coordinates.longitude, language, todayKey, initialLocationLoading, prayerReminderPreferencesLoaded, prayerReminderPreferences, prayerTimeAdjustmentsLoaded, prayerTimeAdjustments]);

  async function toggleReminders() {
    if (remindersOn) {
      await cancelPrayerReminders();
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, 'false');
      setRemindersOn(false);
      return;
    }
    const enabled = await enablePrayerReminders(coordinates.latitude, coordinates.longitude, language, {
      prayerPreferences: prayerReminderPreferences,
      timeAdjustments: prayerTimeAdjustments,
    });
    if (enabled) {
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, 'true');
    }
    setRemindersOn(enabled);
  }

  async function togglePrayerReminder(prayerName: PrayerName) {
    const updated = {
      ...prayerReminderPreferences,
      [prayerName]: !prayerReminderPreferences[prayerName],
    };
    setPrayerReminderPreferences(updated);
    await AsyncStorage.setItem(PRAYER_REMINDERS_STORAGE_KEY, JSON.stringify(updated));
  }

  async function changePrayerTimeAdjustment(prayerName: PrayerName, change: number) {
    const updated = {
      ...prayerTimeAdjustments,
      [prayerName]: Math.max(
        -MAX_PRAYER_TIME_ADJUSTMENT_MINUTES,
        Math.min(MAX_PRAYER_TIME_ADJUSTMENT_MINUTES, prayerTimeAdjustments[prayerName] + change),
      ),
    };
    if (!arePrayerTimeAdjustmentsValid(coordinates.latitude, coordinates.longitude, now, updated)) {
      Alert.alert(copy.adjustPrayerTimes, copy.invalidAdjustment);
      return;
    }
    setPrayerTimeAdjustments(updated);
    await AsyncStorage.setItem(PRAYER_TIME_ADJUSTMENTS_STORAGE_KEY, JSON.stringify(updated));
  }

  async function resetPrayerTimeAdjustments() {
    setPrayerTimeAdjustments(DEFAULT_PRAYER_TIME_ADJUSTMENTS);
    await AsyncStorage.setItem(PRAYER_TIME_ADJUSTMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_PRAYER_TIME_ADJUSTMENTS));
  }

  function openMosqueScheduleEditor() {
    setMosqueScheduleDraft({ mosqueName: mosqueSchedule.mosqueName, times: { ...mosqueSchedule.times } });
    setMosqueScheduleOpen(true);
  }

  async function saveMosqueSchedule() {
    let hasInvalidTime = false;
    const times = Object.fromEntries(PRAYER_NAMES.map((name) => {
      const value = mosqueScheduleDraft.times[name].trim();
      if (!value) return [name, ''];
      const normalized = normalizeClockTime(value);
      if (!normalized) hasInvalidTime = true;
      return [name, normalized ?? value];
    })) as Record<PrayerName, string>;

    if (hasInvalidTime) {
      Alert.alert(copy.mosqueSchedule, copy.invalidMosqueTime);
      return;
    }

    const updated = { mosqueName: mosqueScheduleDraft.mosqueName.trim(), times };
    setMosqueSchedule(updated);
    await AsyncStorage.setItem(MOSQUE_SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    setMosqueScheduleOpen(false);
  }

  async function clearMosqueSchedule() {
    setMosqueSchedule(EMPTY_MOSQUE_SCHEDULE);
    setMosqueScheduleDraft(EMPTY_MOSQUE_SCHEDULE);
    await AsyncStorage.removeItem(MOSQUE_SCHEDULE_STORAGE_KEY);
    setMosqueScheduleOpen(false);
  }

  async function togglePrayerCompleted(prayerName: string) {
    const updated = { ...completedPrayers, [prayerName]: !completedPrayers[prayerName] };
    setCompletedPrayers(updated);
    await AsyncStorage.setItem(`azan-prayer-tracker-${getLocalDateKey(now)}`, JSON.stringify(updated));
    if (prayers.every((prayer) => updated[prayer.name])) {
      setShowCompletionMessage(true);
    }
  }

  if (showLaunchScreen) {
    return (
      <SafeAreaView style={styles.launchScreen}>
        <StatusBar style="light" />
        <Image
          accessibilityLabel="Azan app icon"
          source={require('./assets/icon.png')}
          style={styles.launchLogo}
        />
        <Text style={styles.launchTitle}>Azan</Text>
        <Text style={styles.launchSubtitle}>{copy.launchSubtitle}</Text>
        <View style={styles.launchCredit}>
          <Text style={styles.launchCreditLabel}>{copy.developed}</Text>
          <Text style={styles.launchCreditName}>MD Faiyazuddin</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (initialLocationLoading || !prayerTimeAdjustmentsLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#e2b65e" />
        <Text style={styles.loadingTitle}>{copy.finding}</Text>
        <Text style={styles.loadingText}>{copy.preparing}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{copy.companion}</Text>
            <Text style={styles.title}>Azan</Text>
          </View>
          <Pressable style={styles.languageButton} onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}>
            <Text style={styles.languageButtonText}>{language === 'en' ? 'हिंदी' : 'EN'}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel="Update current location"
          accessibilityRole="button"
          style={[styles.locationCard, locationError && styles.locationCardError]}
          onPress={loadLocation}
          disabled={locationLoading}
        >
          <View style={styles.locationMarker}><Text style={styles.locationDot}>+</Text></View>
          <View style={styles.locationDetails}>
            <Text style={styles.locationCaption}>{copy.current}</Text>
            <Text style={styles.locationText}>{locationError ? copy.unavailable : city}</Text>
            <Text style={styles.locationStatus}>{locationStatus}</Text>
          </View>
          <View style={styles.updateControl}>
            {locationLoading ? <ActivityIndicator size="small" color="#e2b65e" /> : <Text style={styles.updateLocationText}>{copy.update}</Text>}
          </View>
        </Pressable>
        <Pressable style={styles.changeLocationButton} onPress={() => setLocationPickerOpen(true)}>
          <Text style={styles.changeLocationText}>{copy.chooseCity}</Text>
          <Text style={styles.changeLocationArrow}>›</Text>
        </Pressable>

        <Text style={styles.date}>{dateLabel}</Text>

        <View style={styles.nextCard}>
          <View style={styles.nextTopline}>
            <Text style={styles.nextLabel}>{copy.next}</Text>
            <Text style={styles.nextTime}>{formatTime(nextPrayer.time)}</Text>
          </View>
          <Text style={styles.nextName}>{getPrayerLabel(nextPrayer.name, language)}</Text>
          <Text style={styles.calculatedLabel}>{copy.calculatedStart}</Text>
          <View style={styles.countdownRow}>
            <Text style={styles.countdown}>{countdown}</Text>
            <Text style={styles.countdownLabel}>{copy.until}</Text>
          </View>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        </View>

        <View style={styles.qiblaCard}>
          <View style={styles.qiblaCopy}>
            <Text style={styles.qiblaTitle}>{copy.qibla}</Text>
            <Text style={styles.qiblaBearing}>{Math.round(qiblaBearing)}°</Text>
            <Text style={styles.qiblaSubtitle}>{copy.qiblaBearingLabel}</Text>
            {compassHeading !== null && <Text style={styles.qiblaHint}>{copy.qiblaCompassHint}</Text>}
            <Text style={styles.qiblaLocation}>{city}</Text>
          </View>
          <View style={styles.compassDial}>
            <Text style={styles.compassNorth}>N</Text>
            <Text style={styles.compassEast}>E</Text>
            <Text style={styles.compassSouth}>S</Text>
            <Text style={styles.compassWest}>W</Text>
            <View style={[styles.compassPointer, { transform: [{ rotate: `${compassRotation}deg` }] }]}>
              <Text style={styles.compassPointerHead}>▲</Text>
              <View style={styles.compassPointerTail} />
            </View>
            <View style={styles.compassCenter} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.monthlyTimetableButton}
          onPress={() => {
            setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            setMonthlyTimetableOpen(true);
          }}
        >
          <Text style={styles.monthlyTimetableButtonText}>{copy.monthlyTimetable}</Text>
          <Text style={styles.monthlyTimetableArrow}>›</Text>
        </Pressable>

        <Text style={styles.mosqueNote}>{copy.mosqueNote}</Text>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{copy.today}</Text>
          <Text style={styles.progressLabel}>{Object.values(completedPrayers).filter(Boolean).length}/5 {copy.done}</Text>
        </View>

        <Pressable style={styles.adjustTimesButton} onPress={() => setTimeAdjustmentsOpen(true)}>
          <Text style={styles.adjustTimesButtonText}>{copy.adjustTimes}</Text>
          <Text style={styles.adjustTimesArrow}>›</Text>
        </Pressable>

        <View style={styles.prayerList}>
          {prayers.map((prayer) => {
            const isNext = prayer.name === nextPrayer.name;
            const completed = completedPrayers[prayer.name] === true;
            return (
              <View
                key={prayer.name}
                style={[styles.prayerRow, isNext && styles.activeRow, completed && styles.completedRow]}
              >
                <View style={[styles.prayerIcon, isNext && styles.activeIcon]}><Text style={styles.iconText}>{prayer.icon}</Text></View>
                <View style={styles.prayerName}><Text style={[styles.nameText, completed && styles.completedName]}>{getPrayerLabel(prayer.name, language)}</Text><Text style={styles.subText}>{copy.endsBy} {formatTime(prayer.endTime)}</Text></View>
                <Text style={[styles.prayerTime, isNext && styles.activeTime]}>{formatTime(prayer.time)}</Text>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel={prayerReminderPreferences[prayer.name]
                    ? copy.reminderOnLabel(getPrayerLabel(prayer.name, language))
                    : copy.reminderOffLabel(getPrayerLabel(prayer.name, language))}
                  accessibilityState={{ checked: prayerReminderPreferences[prayer.name] }}
                  hitSlop={8}
                  onPress={() => togglePrayerReminder(prayer.name)}
                  style={styles.prayerReminderToggle}
                >
                  <Text style={[styles.prayerReminderIcon, !prayerReminderPreferences[prayer.name] && styles.prayerReminderIconOff]}>
                    {prayerReminderPreferences[prayer.name] ? '🔔' : '🔕'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={getPrayerLabel(prayer.name, language)}
                  accessibilityState={{ checked: completed }}
                  hitSlop={6}
                  onPress={() => togglePrayerCompleted(prayer.name)}
                >
                  <View style={[styles.checkbox, completed && styles.checkboxChecked]}>
                    <Text style={styles.checkboxMark}>{completed ? '✓' : ''}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.mosqueScheduleCard}>
          <View style={styles.mosqueScheduleHeader}>
            <View style={styles.mosqueScheduleHeading}>
              <Text style={styles.mosqueScheduleTitle}>{copy.mosqueSchedule}</Text>
              {mosqueSchedule.mosqueName ? <Text style={styles.mosqueScheduleName}>{mosqueSchedule.mosqueName}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" onPress={openMosqueScheduleEditor} style={styles.mosqueScheduleEditButton}>
              <Text style={styles.mosqueScheduleEditText}>{mosqueSchedule.mosqueName || PRAYER_NAMES.some((name) => mosqueSchedule.times[name]) ? copy.editSchedule : copy.editMosqueSchedule}</Text>
            </Pressable>
          </View>
          {PRAYER_NAMES.some((name) => mosqueSchedule.times[name]) ? (
            <View style={styles.mosqueScheduleRows}>
              {PRAYER_NAMES.map((name) => (
                <View key={name} style={styles.mosqueScheduleRow}>
                  <Text style={styles.mosquePrayerName}>{getPrayerLabel(name, language)}</Text>
                  <Text style={styles.mosquePrayerTime}>{mosqueSchedule.times[name] ? formatClockTime(mosqueSchedule.times[name]) : copy.notSet}</Text>
                </View>
              ))}
              <Text style={styles.mosqueScheduleNote}>{copy.calculatedTimesNote}</Text>
            </View>
          ) : (
            <Text style={styles.mosqueScheduleHint}>{copy.mosqueScheduleHint}</Text>
          )}
        </View>

        <Pressable style={[styles.reminderButton, remindersOn && styles.reminderOn]} onPress={toggleReminders}>
          <Text style={styles.bell}>{remindersOn ? 'ON' : 'OFF'}</Text>
          <View style={styles.reminderCopy}><Text style={styles.reminderTitle}>{remindersOn ? copy.remindersOn : copy.remindersOff}</Text><Text style={styles.reminderSub}>{remindersOn ? (hasSelectedPrayerReminders ? copy.scheduled : copy.noPrayerRemindersSelected) : copy.neverMiss}</Text></View>
          <Text style={styles.arrow}>{remindersOn ? 'OK' : '>'}</Text>
        </Pressable>

        <Text style={styles.footer}>{copy.selectedTimes}</Text>
        <View style={styles.creditFooter}>
          <Image
            accessibilityLabel="Azan app icon"
            source={require('./assets/icon.png')}
            style={styles.clubLogo}
          />
          <Text style={styles.creditText}>Developed by MD Faiyazuddin</Text>
        </View>
      </ScrollView>
      <Modal visible={monthlyTimetableOpen} transparent animationType="slide" onRequestClose={() => setMonthlyTimetableOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.monthlyModal}>
            <View style={styles.modalHeader}>
              <View style={styles.adjustmentsHeaderCopy}>
                <Text style={styles.modalTitle}>{copy.monthlyTimetable}</Text>
                <Text style={styles.modalSubtitle}>{city}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setMonthlyTimetableOpen(false)}>
                <Text style={styles.closeButton}>X</Text>
              </Pressable>
            </View>
            <View style={styles.monthSelector}>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.previousMonth} style={styles.monthNavButton} onPress={() => setDisplayMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <Text style={styles.monthNavText}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.nextMonth} style={styles.monthNavButton} onPress={() => setDisplayMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <Text style={styles.monthNavText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.timetableHeaderRow}>
              <Text style={styles.timetableDayCell}>Date</Text>
              {['Fajr', 'Dhu', 'Asr', 'Magh', 'Isha'].map((name) => <Text key={name} style={styles.timetablePrayerHeader}>{name}</Text>)}
            </View>
            <ScrollView style={styles.timetableScroll} contentContainerStyle={styles.timetableRows}>
              {monthlyDays.map(({ date, prayers: dayPrayers }) => (
                <View key={date.toISOString()} style={styles.timetableRow}>
                  <Text style={styles.timetableDayCell}>{date.getDate()}</Text>
                  {dayPrayers.map((prayer) => <Text key={prayer.name} style={styles.timetablePrayerTime}>{formatCompactTime(prayer.time)}</Text>)}
                </View>
              ))}
            </ScrollView>
            <Pressable accessibilityRole="button" style={styles.shareTimetableButton} onPress={shareMonthlyTimetable}>
              <Text style={styles.shareTimetableText}>{copy.shareTimetable}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={mosqueScheduleOpen} transparent animationType="slide" onRequestClose={() => setMosqueScheduleOpen(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.mosqueEditorModal}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.mosqueEditorContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.adjustmentsHeaderCopy}>
                    <Text style={styles.modalTitle}>{copy.mosqueSchedule}</Text>
                    <Text style={styles.modalSubtitle}>{copy.calculatedTimesNote}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setMosqueScheduleOpen(false)}>
                    <Text style={styles.closeButton}>X</Text>
                  </Pressable>
                </View>
                <Text style={styles.mosqueInputLabel}>{copy.mosqueName}</Text>
                <TextInput
                  value={mosqueScheduleDraft.mosqueName}
                  onChangeText={(mosqueName) => setMosqueScheduleDraft((current) => ({ ...current, mosqueName }))}
                  placeholder={copy.mosqueName}
                  placeholderTextColor="#78968b"
                  style={styles.locationInput}
                  returnKeyType="next"
                />
                <Text style={styles.mosqueInputLabel}>{copy.jamaatTimes}</Text>
                <Text style={styles.mosqueInputHint}>{copy.time24HourHint}</Text>
                <View style={styles.mosqueTimeInputs}>
                  {PRAYER_NAMES.map((name) => (
                    <View key={name} style={styles.mosqueTimeInputRow}>
                      <Text style={styles.mosquePrayerName}>{getPrayerLabel(name, language)}</Text>
                      <TextInput
                        value={mosqueScheduleDraft.times[name]}
                        onChangeText={(value) => setMosqueScheduleDraft((current) => ({
                          ...current,
                          times: { ...current.times, [name]: value },
                        }))}
                        placeholder="HH:MM"
                        placeholderTextColor="#78968b"
                        style={styles.mosqueTimeInput}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        returnKeyType={name === 'Isha' ? 'done' : 'next'}
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.mosqueEditorActions}>
                  <Pressable style={styles.clearMosqueScheduleButton} onPress={clearMosqueSchedule}>
                    <Text style={styles.clearMosqueScheduleText}>{copy.clearMosqueSchedule}</Text>
                  </Pressable>
                  <Pressable style={styles.saveMosqueScheduleButton} onPress={saveMosqueSchedule}>
                    <Text style={styles.saveMosqueScheduleText}>{copy.save}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <Modal visible={timeAdjustmentsOpen} transparent animationType="slide" onRequestClose={() => setTimeAdjustmentsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.adjustmentsModal}>
            <View style={styles.modalHeader}>
              <View style={styles.adjustmentsHeaderCopy}>
                <Text style={styles.modalTitle}>{copy.adjustPrayerTimes}</Text>
                <Text style={styles.modalSubtitle}>{copy.adjustmentHelp}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setTimeAdjustmentsOpen(false)}>
                <Text style={styles.closeButton}>X</Text>
              </Pressable>
            </View>
            <View style={styles.adjustmentList}>
              {PRAYER_NAMES.map((prayerName) => {
                const adjustment = prayerTimeAdjustments[prayerName];
                return (
                  <View key={prayerName} style={styles.adjustmentRow}>
                    <Text style={styles.adjustmentPrayerName}>{getPrayerLabel(prayerName, language)}</Text>
                    <View style={styles.adjustmentControls}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={copy.decreaseAdjustmentLabel(getPrayerLabel(prayerName, language))}
                        disabled={adjustment <= -MAX_PRAYER_TIME_ADJUSTMENT_MINUTES}
                        onPress={() => changePrayerTimeAdjustment(prayerName, -1)}
                        style={[styles.adjustmentStepButton, adjustment <= -MAX_PRAYER_TIME_ADJUSTMENT_MINUTES && styles.adjustmentStepButtonDisabled]}
                      >
                        <Text style={styles.adjustmentStepText}>−</Text>
                      </Pressable>
                      <Text style={styles.adjustmentValue}>{adjustment > 0 ? '+' : ''}{adjustment} {copy.minute}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={copy.increaseAdjustmentLabel(getPrayerLabel(prayerName, language))}
                        disabled={adjustment >= MAX_PRAYER_TIME_ADJUSTMENT_MINUTES}
                        onPress={() => changePrayerTimeAdjustment(prayerName, 1)}
                        style={[styles.adjustmentStepButton, adjustment >= MAX_PRAYER_TIME_ADJUSTMENT_MINUTES && styles.adjustmentStepButtonDisabled]}
                      >
                        <Text style={styles.adjustmentStepText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
            <Pressable style={styles.resetAdjustmentsButton} onPress={resetPrayerTimeAdjustments}>
              <Text style={styles.resetAdjustmentsText}>{copy.resetAdjustments}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={locationPickerOpen} transparent animationType="slide" onRequestClose={() => setLocationPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.locationModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{copy.choose}</Text>
                <Text style={styles.modalSubtitle}>{copy.anywhere}</Text>
              </View>
              <Pressable onPress={() => setLocationPickerOpen(false)}><Text style={styles.closeButton}>X</Text></Pressable>
            </View>
            <TextInput
              autoFocus
              value={locationQuery}
              onChangeText={setLocationQuery}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#78968b"
              style={styles.locationInput}
              returnKeyType="search"
              onSubmitEditing={() => selectLocation(locationQuery)}
            />
            <Pressable style={styles.searchButton} onPress={() => selectLocation(locationQuery)} disabled={searchingLocation}>
              {searchingLocation ? <ActivityIndicator color="#173c37" /> : <Text style={styles.searchButtonText}>{copy.useLocation}</Text>}
            </Pressable>
            <Text style={styles.suggestionsLabel}>{copy.quick}</Text>
            <View style={styles.suggestionRow}>
              {['London, UK', 'Dubai, UAE', 'Patna, India'].map((suggestion) => (
                <Pressable key={suggestion} style={styles.suggestion} onPress={() => selectLocation(suggestion)}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showCompletionMessage} transparent animationType="fade" onRequestClose={() => setShowCompletionMessage(false)}>
        <View style={styles.completionBackdrop}>
          <View style={styles.completionCard}>
            <Text style={styles.completionMark}>{copy.completed}</Text>
            <Text style={styles.completionTitle}>{copy.wellDone}</Text>
            <Text style={styles.completionText}>{copy.allDone}</Text>
            <Pressable style={styles.completionButton} onPress={() => setShowCompletionMessage(false)}>
              <Text style={styles.completionButtonText}>{copy.continue}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#102c2b' },
  launchScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#102c2b' },
  launchLogo: { width: 94, height: 118, resizeMode: 'contain' },
  launchTitle: { color: '#f5f1e6', fontSize: 46, fontWeight: '900', marginTop: 22 },
  launchSubtitle: { color: '#9bb5a7', fontSize: 14, marginTop: 6 },
  launchCredit: { position: 'absolute', bottom: 48, alignItems: 'center' },
  launchCreditLabel: { color: '#6f9083', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  launchCreditName: { color: '#e2b65e', fontSize: 13, fontWeight: '700', marginTop: 6 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#102c2b' },
  loadingTitle: { color: '#f5f1e6', fontSize: 20, fontWeight: '800', marginTop: 18 },
  loadingText: { color: '#9bb5a7', fontSize: 13, marginTop: 7 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 32,
    backgroundColor: '#102c2b',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#9bb5a7', fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  title: { color: '#f5f1e6', fontSize: 42, fontWeight: '800', marginTop: 3 },
  languageButton: { borderWidth: 1, borderColor: '#56806f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 5 },
  languageButtonText: { color: '#f4c96d', fontSize: 12, fontWeight: '800' },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b3b38', borderWidth: 1, borderColor: '#41635c', borderRadius: 16, padding: 14, marginTop: 20, marginBottom: 20 },
  locationCardError: { borderColor: '#a76e5e' },
  locationMarker: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#284945', marginRight: 12 },
  locationDot: { color: '#f4bd5e', fontSize: 18, fontWeight: '700' },
  locationDetails: { flex: 1 },
  locationCaption: { color: '#6f9083', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  locationText: { color: '#dbe6dc', fontSize: 12, fontWeight: '600' },
  locationStatus: { color: '#85a198', fontSize: 10, marginTop: 3 },
  updateControl: { minWidth: 56, alignItems: 'flex-end' },
  updateLocationText: { color: '#f4c96d', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  changeLocationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 4 },
  changeLocationText: { color: '#f4c96d', fontSize: 12, fontWeight: '700' },
  changeLocationArrow: { color: '#f4c96d', fontSize: 22, lineHeight: 18 },
  date: { color: '#9bb5a7', fontSize: 15, marginBottom: 25 },
  nextCard: { backgroundColor: '#e2b65e', borderRadius: 18, padding: 22, minHeight: 196 },
  qiblaCard: { backgroundColor: '#1b3b38', borderWidth: 1, borderColor: '#41635c', borderRadius: 16, padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qiblaCopy: { flex: 1, paddingRight: 12 },
  qiblaTitle: { color: '#9bb5a7', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  qiblaBearing: { color: '#f4c96d', fontSize: 30, fontWeight: '800', marginTop: 5 },
  qiblaSubtitle: { color: '#dbe6dc', fontSize: 11, marginTop: 1 },
  qiblaHint: { color: '#9bb5a7', fontSize: 10, lineHeight: 14, marginTop: 4 },
  qiblaLocation: { color: '#85a198', fontSize: 10, marginTop: 5 },
  monthlyTimetableButton: { backgroundColor: '#1b3b38', borderWidth: 1, borderColor: '#41635c', borderRadius: 12, minHeight: 46, paddingHorizontal: 15, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthlyTimetableButtonText: { color: '#f4c96d', fontSize: 13, fontWeight: '700' },
  monthlyTimetableArrow: { color: '#f4c96d', fontSize: 23, lineHeight: 24 },
  monthlyModal: { backgroundColor: '#173c37', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 20 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  monthNavButton: { width: 42, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#244a43' },
  monthNavText: { color: '#f4c96d', fontSize: 25, lineHeight: 28, fontWeight: '700' },
  monthLabel: { color: '#f5f1e6', fontSize: 17, fontWeight: '700' },
  timetableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#56806f' },
  timetableDayCell: { width: 38, color: '#9bb5a7', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  timetablePrayerHeader: { flex: 1, color: '#9bb5a7', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  timetableScroll: { flex: 1 },
  timetableRows: { paddingBottom: 10 },
  timetableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 35, borderBottomWidth: 1, borderBottomColor: '#284945' },
  timetablePrayerTime: { flex: 1, color: '#dbe6dc', fontSize: 10, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
  shareTimetableButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#e2b65e', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  shareTimetableText: { color: '#173c37', fontSize: 14, fontWeight: '800' },
  compassDial: { width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: '#56806f', alignItems: 'center', justifyContent: 'center', backgroundColor: '#173c37' },
  compassNorth: { position: 'absolute', top: 5, color: '#f4c96d', fontSize: 9, fontWeight: '900' },
  compassEast: { position: 'absolute', right: 7, color: '#9bb5a7', fontSize: 8, fontWeight: '700' },
  compassSouth: { position: 'absolute', bottom: 5, color: '#9bb5a7', fontSize: 8, fontWeight: '700' },
  compassWest: { position: 'absolute', left: 7, color: '#9bb5a7', fontSize: 8, fontWeight: '700' },
  compassPointer: { position: 'absolute', width: 24, height: 58, alignItems: 'center', justifyContent: 'flex-start' },
  compassPointerHead: { color: '#e2b65e', fontSize: 19, lineHeight: 22 },
  compassPointerTail: { width: 3, height: 25, borderRadius: 2, backgroundColor: '#e2b65e' },
  compassCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f5f1e6', position: 'absolute' },
  nextTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextLabel: { color: '#5d4b24', fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
  nextTime: { color: '#5d4b24', fontSize: 17, fontWeight: '700' },
  nextName: { color: '#173c37', fontSize: 39, fontWeight: '800', marginTop: 14 },
  calculatedLabel: { color: '#5d4b24', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  countdown: { color: '#173c37', fontSize: 21, fontWeight: '800' },
  countdownLabel: { color: '#5d4b24', fontSize: 13, marginLeft: 8 },
  progressTrack: { backgroundColor: '#c69d4c', height: 5, borderRadius: 3, marginTop: 22, overflow: 'hidden' },
  progressFill: { width: '42%', height: '100%', backgroundColor: '#173c37', borderRadius: 3 },
  mosqueNote: { color: '#78968b', fontSize: 11, lineHeight: 16, marginTop: 10 },
  mosqueScheduleCard: { backgroundColor: '#1b3b38', borderWidth: 1, borderColor: '#41635c', borderRadius: 16, padding: 15, marginTop: 16 },
  mosqueScheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mosqueScheduleHeading: { flex: 1 },
  mosqueScheduleTitle: { color: '#9bb5a7', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  mosqueScheduleName: { color: '#f5f1e6', fontSize: 15, fontWeight: '700', marginTop: 5 },
  mosqueScheduleEditButton: { borderWidth: 1, borderColor: '#56806f', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  mosqueScheduleEditText: { color: '#f4c96d', fontSize: 11, fontWeight: '700' },
  mosqueScheduleHint: { color: '#85a198', fontSize: 12, lineHeight: 18, marginTop: 10 },
  mosqueScheduleRows: { marginTop: 10 },
  mosqueScheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#284945' },
  mosquePrayerName: { color: '#dbe6dc', fontSize: 13, fontWeight: '600' },
  mosquePrayerTime: { color: '#f4c96d', fontSize: 13, fontWeight: '700' },
  mosqueScheduleNote: { color: '#85a198', fontSize: 10, lineHeight: 15, marginTop: 8 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 30, marginBottom: 13 },
  sectionTitle: { color: '#f5f1e6', fontSize: 20, fontWeight: '700' },
  progressLabel: { color: '#f4c96d', fontSize: 11, fontWeight: '700' },
  adjustTimesButton: { backgroundColor: '#1b3b38', borderWidth: 1, borderColor: '#41635c', borderRadius: 12, minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  adjustTimesButtonText: { color: '#f4c96d', fontSize: 12, fontWeight: '700' },
  adjustTimesArrow: { color: '#f4c96d', fontSize: 21, lineHeight: 22 },
  prayerList: { gap: 8 },
  prayerRow: { backgroundColor: '#1b3b38', borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#284945' },
  activeRow: { backgroundColor: '#244a43', borderColor: '#56806f' },
  completedRow: { opacity: 0.72 },
  prayerIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#284945' },
  activeIcon: { backgroundColor: '#e2b65e' },
  iconText: { color: '#9bb5a7', fontSize: 11, fontWeight: '800' },
  prayerName: { flex: 1, marginLeft: 12 },
  nameText: { color: '#f5f1e6', fontSize: 16, fontWeight: '700' },
  completedName: { textDecorationLine: 'line-through', color: '#b9c8bd' },
  subText: { color: '#85a198', fontSize: 11, marginTop: 2 },
  prayerTime: { color: '#dbe6dc', fontSize: 16, fontWeight: '700' },
  activeTime: { color: '#f4c96d' },
  prayerReminderToggle: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  prayerReminderIcon: { fontSize: 17 },
  prayerReminderIconOff: { opacity: 0.45 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#709287', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  checkboxChecked: { backgroundColor: '#e2b65e', borderColor: '#e2b65e' },
  checkboxMark: { color: '#173c37', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  reminderButton: { backgroundColor: '#f5f1e6', borderRadius: 14, padding: 15, marginTop: 24, flexDirection: 'row', alignItems: 'center' },
  reminderOn: { backgroundColor: '#dce9dd' },
  bell: { color: '#173c37', fontSize: 11, fontWeight: '900', width: 34 },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: '#173c37', fontSize: 15, fontWeight: '800' },
  reminderSub: { color: '#5d756d', fontSize: 11, marginTop: 3 },
  arrow: { color: '#173c37', fontSize: 13, fontWeight: '900' },
  footer: { color: '#6f9083', fontSize: 11, textAlign: 'center', marginTop: 18 },
  creditFooter: { alignItems: 'center', marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#284945' },
  clubLogo: { width: 34, height: 42, resizeMode: 'contain', marginBottom: 8 },
  creditText: { color: '#dbe6dc', fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  keyboardAvoiding: { flex: 1, justifyContent: 'flex-end' },
  mosqueEditorModal: { backgroundColor: '#173c37', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  mosqueEditorContent: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30 },
  mosqueInputLabel: { color: '#f5f1e6', fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  mosqueInputHint: { color: '#9bb5a7', fontSize: 11, marginBottom: 8 },
  mosqueTimeInputs: { gap: 8 },
  mosqueTimeInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#244a43' },
  mosqueTimeInput: { width: 94, color: '#f5f1e6', fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: '#56806f', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  mosqueEditorActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  clearMosqueScheduleButton: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#56806f', borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  clearMosqueScheduleText: { color: '#dbe6dc', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  saveMosqueScheduleButton: { flex: 1, minHeight: 46, backgroundColor: '#e2b65e', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  saveMosqueScheduleText: { color: '#173c37', fontSize: 13, fontWeight: '800' },
  adjustmentsModal: { backgroundColor: '#173c37', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 32, maxHeight: '82%' },
  adjustmentsHeaderCopy: { flex: 1, paddingRight: 12 },
  adjustmentList: { gap: 8 },
  adjustmentRow: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#244a43', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adjustmentPrayerName: { color: '#f5f1e6', fontSize: 15, fontWeight: '700' },
  adjustmentControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adjustmentStepButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e2b65e', alignItems: 'center', justifyContent: 'center' },
  adjustmentStepButtonDisabled: { opacity: 0.4 },
  adjustmentStepText: { color: '#173c37', fontSize: 22, lineHeight: 25, fontWeight: '800' },
  adjustmentValue: { width: 70, color: '#f5f1e6', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  resetAdjustmentsButton: { minHeight: 46, marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#56806f', alignItems: 'center', justifyContent: 'center' },
  resetAdjustmentsText: { color: '#f4c96d', fontSize: 13, fontWeight: '700' },
  locationModal: { backgroundColor: '#173c37', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { color: '#f5f1e6', fontSize: 24, fontWeight: '800' },
  modalSubtitle: { color: '#9bb5a7', fontSize: 12, marginTop: 4 },
  closeButton: { color: '#dbe6dc', fontSize: 14, fontWeight: '800', padding: 4 },
  locationInput: { backgroundColor: '#244a43', borderWidth: 1, borderColor: '#56806f', borderRadius: 12, color: '#f5f1e6', paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  searchButton: { backgroundColor: '#e2b65e', borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  searchButtonText: { color: '#173c37', fontSize: 14, fontWeight: '800' },
  suggestionsLabel: { color: '#6f9083', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  suggestionRow: { gap: 8 },
  suggestion: { paddingVertical: 11, paddingHorizontal: 13, backgroundColor: '#244a43', borderRadius: 10 },
  suggestionText: { color: '#dbe6dc', fontSize: 13, fontWeight: '600' },
  completionBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(8, 27, 25, 0.72)' },
  completionCard: { width: '100%', backgroundColor: '#f5f1e6', borderRadius: 22, padding: 26, alignItems: 'center' },
  completionMark: { color: '#a2782f', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  completionTitle: { color: '#173c37', fontSize: 30, fontWeight: '900', marginTop: 8 },
  completionText: { color: '#5d756d', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  completionButton: { width: '100%', backgroundColor: '#e2b65e', borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  completionButtonText: { color: '#173c37', fontSize: 14, fontWeight: '800' },
});
