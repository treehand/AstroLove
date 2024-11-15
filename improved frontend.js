import React, { useState, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, Button, TextInput } from 'react-native-paper';
import * as Yup from 'yup';
import { useForm, Controller } from 'react-hook-form';
import { VictoryPie } from 'victory-native';
import RazorpayCheckout from 'react-native-razorpay';

// State Management with React Context
const AppContext = React.createContext();

// App Component
const App = () => {
  const [userProfile, setUserProfile] = useState({});
  const [isPremium, setIsPremium] = useState(false);

  return (
    <AppContext.Provider value={{ userProfile, setUserProfile, isPremium, setIsPremium }}>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="LandingPage">
            <Stack.Screen name="LandingPage" component={LandingPage} />
            <Stack.Screen name="Login" component={LoginPage} />
            <Stack.Screen name="PersonalityInput" component={PersonalityInput} />
            <Stack.Screen name="HoroscopeInput" component={isPremium ? HoroscopeInput : UpgradePage} />
            <Stack.Screen name="Results" component={ResultsPage} />
            <Stack.Screen name="UpgradePage" component={UpgradePage} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </AppContext.Provider>
  );
};

// LandingPage Component
const LandingPage = ({ navigation }) => {
  return (
    <PaperProvider.Surface style={styles.container}>
      <Title style={styles.title}>Love Compatibility</Title>
      <Paragraph style={styles.subtitle}>
        Find your perfect match based on personality and astrology.{'\n'}
        {'\n'}
        Get premium features with a subscription.
      </Paragraph>
      <Button mode="contained" onPress={() => navigation.navigate('PersonalityInput')}>
        Sign Up
      </Button>
      <Button mode="outlined" onPress={() => navigation.navigate('Login')}>
        Log In
      </Button>
    </PaperProvider.Surface>
  );
};

// LoginPage Component
const LoginPage = () => {
  const { control, handleSubmit, errors } = useForm({
    resolver: yupResolver(
      Yup.object().shape({
        email: Yup.string().email('Invalid email address').required('Email is required'),
        password: Yup.string().required('Password is required'),
      })
    ),
  });

  const onSubmit = (data) => {
    // API Call for login
    console.log(data);
  };

  return (
    <PaperProvider.Surface style={styles.container}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Email"
            value="user@example.com"
            onChangeText={onChange}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Password"
            value="password123"
            onChangeText={onChange}
            error={!!errors.password}
            helperText={errors.password?.message}
            secureTextEntry
          />
        )}
      />
      <Button mode="contained" onPress={handleSubmit(onSubmit)}>
        Log In
      </Button>
    </PaperProvider.Surface>
  );
};

// PersonalityInput Component
const PersonalityInput = () => {
  const { userProfile, setUserProfile } = useContext(AppContext);
  const [extroversion, setExtroversion] = useState(7);

  const handleContinue = () => {
    setUserProfile({ ...userProfile, extroversion });
    navigation.navigate('HoroscopeInput');
  };

  return (
    <PaperProvider.Surface style={styles.container}>
      <Title style={styles.label}>How extroverted are you?</Title>
      <Slider
        style={{ width: 300 }}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={extroversion}
        onValueChange={setExtroversion}
      />
      <Paragraph>Extroversion Level: {extroversion}</Paragraph>
      <Button mode="contained" onPress={handleContinue}>
        Continue
      </Button>
    </PaperProvider.Surface>
  );
};

// HoroscopeInput Component
const HoroscopeInput = () => {
  const { userProfile, setUserProfile } = useContext(AppContext);
  const { control, handleSubmit, errors } = useForm({
    resolver: yupResolver(
      Yup.object().shape({
        birthDate: Yup.date().required('Birth date is required'),
        birthTime: Yup.string().matches(/^([01]?\d|2[0-3]):([0-5]?\d)$/, 'Invalid time format').required('Birth time is required'),
        location: Yup.string().required('Location is required'),
      })
    ),
  });

  const onSubmit = (data) => {
    setUserProfile({ ...userProfile, ...data });
    navigation.navigate('Results');
  };

  return (
    <PaperProvider.Surface style={styles.container}>
      <Title style={styles.label}>Enter your birth details:</Title>
      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Birth Date (YYYY-MM-DD)"
            value="1990-05-15"
            onChangeText={onChange}
            error={!!errors.birthDate}
            helperText={errors.birthDate?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="birthTime"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Birth Time (HH:MM)"
            value="12:30"
            onChangeText={onChange}
            error={!!errors.birthTime}
            helperText={errors.birthTime?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Location"
            value="New York, USA"
            onChangeText={onChange}
            error={!!errors.location}
            helperText={errors.location?.message}
          />
        )}
      />
      <Button mode="contained" onPress={handleSubmit(onSubmit)}>
        Submit
      </Button>
    </PaperProvider.Surface>
  );
};

// UpgradePage Component
const UpgradePage = () => {
  const { setIsPremium } = useContext(AppContext);

  const handleUpgrade = () => {
    const options = {
      description: 'Love Compatibility Premium Subscription',
      image: 'https://i.imgur.com/3g7nmJC.png',
      currency: 'USD',
      key: 'rzp_test_1DP5mmOlF5G5ag',
      amount: 999,
      name: 'Love Compatibility',
      prefill: {
        email: 'user@example.com',
        contact: '9999999999',
        name: 'John Doe',
      },
      theme: { color: '#F37254' },
    };

    RazorpayCheckout.open(options).then((data) => {
      setIsPremium(true);
      // Handle successful payment
    }).catch((error) => {
      // Handle payment error
    });
  };

  return (
    <PaperProvider.Surface style={styles.container}>
      <Title style={styles.title}>Upgrade to Premium</Title>
      <Paragraph style={styles.subtitle}>
        Unlock the horoscope compatibility feature with a premium subscription.
      </Paragraph>
      <Button mode="contained" onPress={handleUpgrade}>
        Upgrade - $9.99/month
      </Button>
    </PaperProvider.Surface>
  );
};

// ResultsPage Component
const ResultsPage = () => {
  const { userProfile } = useContext(AppContext);
  const matches = [
    { name: 'Match 1', score: 85 },
    { name: 'Match 2', score: 75 },
    { name: 'Match 3', score: 65 },
  ];

  return (
    <PaperProvider.Surface style={styles.container}>
      <Title style={styles.title}>Your Compatibility Results</Title>
      <VictoryPie data={matches.map((match) => ({ x: match.name, y: match.score }))} />
    </PaperProvider.Surface>
  );
};

const styles = {
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, marginBottom: 20 },
  subtitle: { fontSize: 16, textAlign: 'center', marginVertical: 20 },
  label: { fontSize: 18, marginBottom: 15 },
};

export default App;