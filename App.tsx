import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan';
import {
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Prayer = { name: string; arabic: string; time: Date; icon: string };
type CompletedPrayers = Record<string, boolean>;
type Language = 'en' | 'hi';

const COPY = {
  en: {
    companion: 'YOUR DAILY COMPANION', launchSubtitle: 'Prayer times, wherever you are', developed: 'DEVELOPED BY',
    finding: 'Finding your location', preparing: "Preparing today's prayer times", current: 'CURRENT LOCATION',
    unavailable: 'Location unavailable', update: 'UPDATE', chooseCity: 'Choose another city', next: 'NEXT PRAYER',
    until: 'until prayer time', calculatedStart: 'CALCULATED PRAYER-START TIME', mosqueNote: 'Mosque Azan/Jama’at times may follow a different local schedule.', today: "Today's prayers", done: 'done', remindersOn: 'Reminders enabled',
    remindersOff: 'Get prayer reminders', scheduled: 'Daily notifications are scheduled', neverMiss: 'Never miss a prayer time',
    selectedTimes: 'Prayer times for your selected location', choose: 'Choose a city', anywhere: 'View prayer times anywhere',
    searchPlaceholder: 'Search city or country', useLocation: 'Use this location', quick: 'QUICK LOCATIONS', completed: 'DONE',
    wellDone: 'Well done', allDone: 'You completed all five prayers for today.', continue: 'Continue',
    notificationsOff: 'Notifications are off', enableNotifications: 'Enable notifications in your device settings to receive reminders.',
    locationNotFound: 'Location not found', tryCity: 'Try a city and country, such as London, United Kingdom.',
    searchFailed: 'Could not search location', checkInternet: 'Check your internet connection and try again.',
    updating: 'Updating location...', permission: 'Location permission is needed', updated: 'Prayer times updated', failed: 'Could not update location',
    prayerBody: (name: string) => `It is time for ${name}.`, prayerTitle: (name: string) => `${name} prayer`,
  },
  hi: {
    companion: 'आपका रोज़ाना साथी', launchSubtitle: 'जहाँ भी हों, नमाज़ का समय', developed: 'द्वारा विकसित',
    finding: 'आपकी लोकेशन खोज रहे हैं', preparing: 'आज के नमाज़ के समय तैयार हो रहे हैं', current: 'वर्तमान लोकेशन',
    unavailable: 'लोकेशन उपलब्ध नहीं', update: 'अपडेट', chooseCity: 'दूसरा शहर चुनें', next: 'अगली नमाज़',
    until: 'नमाज़ तक बाकी समय', calculatedStart: 'नमाज़ शुरू होने का हिसाब किया गया समय', mosqueNote: 'मस्जिद का अज़ान/जमाअत समय अलग स्थानीय शेड्यूल हो सकता है।', today: 'आज की नमाज़', done: 'पूरी', remindersOn: 'रिमाइंडर चालू हैं',
    remindersOff: 'नमाज़ के रिमाइंडर पाएं', scheduled: 'रोज़ाना नोटिफिकेशन शेड्यूल हैं', neverMiss: 'कोई नमाज़ न छूटे',
    selectedTimes: 'चुनी गई लोकेशन के नमाज़ के समय', choose: 'शहर चुनें', anywhere: 'कहीं भी नमाज़ का समय देखें',
    searchPlaceholder: 'शहर या देश खोजें', useLocation: 'यह लोकेशन चुनें', quick: 'जल्दी चुनें', completed: 'पूरा',
    wellDone: 'बहुत अच्छा', allDone: 'आज की पाँचों नमाज़ पूरी हो गईं।', continue: 'जारी रखें',
    notificationsOff: 'नोटिफिकेशन बंद हैं', enableNotifications: 'रिमाइंडर पाने के लिए डिवाइस सेटिंग्स में नोटिफिकेशन चालू करें।',
    locationNotFound: 'लोकेशन नहीं मिली', tryCity: 'शहर और देश लिखें, जैसे London, United Kingdom।',
    searchFailed: 'लोकेशन खोज नहीं सके', checkInternet: 'इंटरनेट कनेक्शन जाँचकर फिर कोशिश करें।',
    updating: 'लोकेशन अपडेट हो रही है...', permission: 'लोकेशन की अनुमति ज़रूरी है', updated: 'नमाज़ के समय अपडेट हो गए', failed: 'लोकेशन अपडेट नहीं हो सकी',
    prayerBody: (name: string) => `${name} की नमाज़ का समय हो गया है।`, prayerTitle: (name: string) => `${name} की नमाज़`,
  },
} as const;

const FALLBACK_COORDINATES = { latitude: 26.1209, longitude: 85.3647 };
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

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPrayers(latitude: number, longitude: number): Prayer[] {
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  const times = new PrayerTimes(new Coordinates(latitude, longitude), new Date(), params);

  return [
    { name: 'Fajr', arabic: 'Dawn', time: times.fajr, icon: '01' },
    { name: 'Dhuhr', arabic: 'Noon', time: times.dhuhr, icon: '02' },
    { name: 'Asr', arabic: 'Afternoon', time: times.asr, icon: '03' },
    { name: 'Maghrib', arabic: 'Sunset', time: times.maghrib, icon: '04' },
    { name: 'Isha', arabic: 'Night', time: times.isha, icon: '05' },
  ];
}

async function enablePrayerReminders(prayers: Prayer[], language: Language) {
  const copy = COPY[language];
  await Notifications.setNotificationChannelAsync('azan-reminders-v2', {
    name: 'Prayer reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'azan.mp3',
    vibrationPattern: [0, 250, 250, 250],
  });

  const permissions = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  if (!permissions.granted) {
    Alert.alert(copy.notificationsOff, copy.enableNotifications);
    return false;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const prayer of prayers) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.prayerTitle(getPrayerLabel(prayer.name, language)),
        body: copy.prayerBody(getPrayerLabel(prayer.name, language)),
        sound: 'azan.mp3',
        data: { prayer: prayer.name },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prayer.time.getHours(),
        minute: prayer.time.getMinutes(),
        channelId: 'azan-reminders-v2',
      },
    });
  }
  return true;
}

export default function App() {
  const [coordinates, setCoordinates] = useState(FALLBACK_COORDINATES);
  const [city, setCity] = useState('Muzaffarpur');
  const [remindersOn, setRemindersOn] = useState(false);
  const [now, setNow] = useState(new Date());
  const [locationLoading, setLocationLoading] = useState(true);
  const [initialLocationLoading, setInitialLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Tap to refresh');
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [completedPrayers, setCompletedPrayers] = useState<CompletedPrayers>({});
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [language, setLanguage] = useState<Language>('en');

  const copy = COPY[language];

  useEffect(() => {
    const timer = setTimeout(() => setShowLaunchScreen(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const trackerKey = `azan-prayer-tracker-${getLocalDateKey(now)}`;
    AsyncStorage.getItem(trackerKey).then((saved) => {
      setCompletedPrayers(saved ? JSON.parse(saved) : {});
    }).catch(() => setCompletedPrayers({}));
  }, [getLocalDateKey(now)]);

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

  const prayers = useMemo(() => getPrayers(coordinates.latitude, coordinates.longitude), [coordinates]);
  const nextPrayer = prayers.find((prayer) => prayer.time.getTime() > now.getTime()) || prayers[0];
  const minutesUntil = Math.max(0, Math.round((nextPrayer.time.getTime() - now.getTime()) / 60000));
  const countdown = minutesUntil >= 60
    ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
    : `${minutesUntil}m`;
  const dateLabel = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  async function toggleReminders() {
    if (remindersOn) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setRemindersOn(false);
      return;
    }
    const enabled = await enablePrayerReminders(prayers, language);
    setRemindersOn(enabled);
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
          accessibilityLabel="Liverpool Football Club crest"
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/1200px-Liverpool_FC.svg.png' }}
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

  if (initialLocationLoading) {
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

        <Text style={styles.mosqueNote}>{copy.mosqueNote}</Text>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{copy.today}</Text>
          <Text style={styles.progressLabel}>{Object.values(completedPrayers).filter(Boolean).length}/5 {copy.done}</Text>
        </View>

        <View style={styles.prayerList}>
          {prayers.map((prayer) => {
            const isNext = prayer.name === nextPrayer.name;
            const completed = completedPrayers[prayer.name] === true;
            return (
              <Pressable
                key={prayer.name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: completed }}
                onPress={() => togglePrayerCompleted(prayer.name)}
                style={[styles.prayerRow, isNext && styles.activeRow, completed && styles.completedRow]}
              >
                <View style={[styles.prayerIcon, isNext && styles.activeIcon]}><Text style={styles.iconText}>{prayer.icon}</Text></View>
                <View style={styles.prayerName}><Text style={[styles.nameText, completed && styles.completedName]}>{getPrayerLabel(prayer.name, language)}</Text><Text style={styles.subText}>{getPrayerDescription(prayer.name, language)}</Text></View>
                <Text style={[styles.prayerTime, isNext && styles.activeTime]}>{formatTime(prayer.time)}</Text>
                <View style={[styles.checkbox, completed && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{completed ? '✓' : ''}</Text></View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={[styles.reminderButton, remindersOn && styles.reminderOn]} onPress={toggleReminders}>
          <Text style={styles.bell}>{remindersOn ? 'ON' : 'OFF'}</Text>
          <View style={styles.reminderCopy}><Text style={styles.reminderTitle}>{remindersOn ? copy.remindersOn : copy.remindersOff}</Text><Text style={styles.reminderSub}>{remindersOn ? copy.scheduled : copy.neverMiss}</Text></View>
          <Text style={styles.arrow}>{remindersOn ? 'OK' : '>'}</Text>
        </Pressable>

        <Text style={styles.footer}>{copy.selectedTimes}</Text>
        <View style={styles.creditFooter}>
          <Image
            accessibilityLabel="Liverpool Football Club crest"
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/1200px-Liverpool_FC.svg.png' }}
            style={styles.clubLogo}
          />
          <Text style={styles.creditText}>Developed by MD Faiyazuddin</Text>
        </View>
      </ScrollView>
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
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 30, marginBottom: 13 },
  sectionTitle: { color: '#f5f1e6', fontSize: 20, fontWeight: '700' },
  progressLabel: { color: '#f4c96d', fontSize: 11, fontWeight: '700' },
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
