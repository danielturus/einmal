import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { View, Image, FlatList, StyleSheet, Clipboard } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { IconButton, Searchbar, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDimensions, useBackHandler } from '@react-native-community/hooks';
import { EmptyState, LinearIndicator, Token } from '../components';
import { useGlobalState, useInteractables } from '../hooks';
import { generateTotp } from '../crypto';
import { isPhysicalDevice } from '../utilities';

const Home: React.FC = () => {
  const [globalState] = useGlobalState();
  const { showSnackbar } = useInteractables();
  const navigation = useNavigation();

  const {
    window: { width: windowWidth },
  } = useDimensions();

  const [tokens, setTokens] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchbarVisible, setSearchbarVisible] = useState(false);
  const [isFABGroupOpen, setFABGroupOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: null,
      headerLeftContainerStyle: {
        width: windowWidth * 0.9,
      },
      headerRightContainerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      headerRight: () => {
        return (
          <>
            {isSearchbarVisible ? null : (
              <IconButton
                icon={() => (
                  <FontAwesome name="search" color="white" size={24} />
                )}
                onPress={() => {
                  setSearchbarVisible(true);
                }}
              />
            )}

            <IconButton
              icon={() => <FontAwesome name="cog" color="white" size={24} />}
              onPress={() => {
                navigation.navigate('Settings');
              }}
            />
          </>
        );
      },
      headerLeft: () => {
        if (isSearchbarVisible) {
          return (
            <Searchbar
              style={styles.searchbar}
              autoFocus={true}
              placeholder="Search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              icon="arrow-left"
              onIconPress={clearAndCloseSearchbar}
            />
          );
        }

        return (
          <Image
            style={styles.headerLogo}
            source={require('../../assets/logo.png')}
          />
        );
      },
    });
  }, [navigation, isSearchbarVisible, searchQuery]);

  useEffect(() => {
    generateTokens();
  }, [globalState.vault]);

  useBackHandler(() => {
    if (isSearchbarVisible) {
      clearAndCloseSearchbar();
      return true;
    }

    return false;
  });

  const generateTokens = useCallback(() => {
    setTokens(
      globalState.vault.map((vaultEntry) => generateTotp(vaultEntry.key)),
    );
  }, [globalState.vault]);

  const clearAndCloseSearchbar = () => {
    setSearchbarVisible(false);
    setSearchQuery('');
  };

  const SECONDS_CAP = 30;
  const cappedSeconds = new Date().getSeconds() % SECONDS_CAP;
  const progress = cappedSeconds / SECONDS_CAP;

  return (
    <View style={styles.container}>
      {globalState.vault.length === 0 ? null : (
        <LinearIndicator
          style={styles.linearIndicator}
          initialProgress={progress}
          duration={SECONDS_CAP * 1000}
          onFinish={generateTokens}
        />
      )}

      <FlatList
        data={globalState.vault.filter((entry) => {
          return entry.issuer.toLowerCase().includes(searchQuery.toLowerCase());
        })}
        renderItem={({ item, index }) => (
          <Token
            issuer={item.issuer}
            token={tokens[index]}
            enableConcealment={false}
            conceal={false}
            onPress={({ token }) => {
              Clipboard.setString(token);
              showSnackbar('Copied to clipboard');
            }}
          />
        )}
        ListEmptyComponent={
          isSearchbarVisible ? null : (
            <EmptyState
              icon="shield-plus-outline"
              heading="Your vault is empty"
              subheading="Configure your accounts to use two-step verification"
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.listItemDivider} />}
        keyExtractor={(item) => [item.issuer, item.account].join(':')}
      />

      <FAB.Group
        style={styles.fab}
        visible={true}
        open={isFABGroupOpen}
        icon={isFABGroupOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'qrcode-scan',
            label: 'Scan QR code',
            onPress: () => {
              if (!isPhysicalDevice()) {
                return alert('Camera only works on physical devices');
              }

              navigation.navigate('BarcodeScanner');
            },
          },
          {
            icon: 'keyboard',
            label: 'Enter manually',
            onPress: () => {},
          },
        ]}
        onStateChange={({ open }) => {
          setFABGroupOpen(open);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerLogo: {
    width: 20,
    height: 20,
    marginHorizontal: 16,
  },
  searchbar: {
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  linearIndicator: {
    flex: 0.005,
  },
  listItemDivider: {
    paddingVertical: 8,
  },
  fab: {
    marginVertical: 16,
    marginHorizontal: 8,
  },
});

export default Home;
