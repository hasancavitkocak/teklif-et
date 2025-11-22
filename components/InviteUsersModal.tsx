import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, X, MapPin, SlidersHorizontal } from 'lucide-react-native';
import { invitationsAPI } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { PROVINCES } from '@/constants/cities';

interface User {
  id: string;
  name: string;
  profile_photo: string;
  birth_date: string;
  city: string;
}

interface InviteUsersModalProps {
  visible: boolean;
  onClose: () => void;
  proposalId: string;
  proposalName: string;
  proposalCity: string;
  proposalInterestId: string;
}

export default function InviteUsersModal({
  visible,
  onClose,
  proposalId,
  proposalName,
  proposalCity,
  proposalInterestId,
}: InviteUsersModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Filtreleme state'leri
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [editingCity, setEditingCity] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(50);
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    if (visible && user) {
      loadInvitableUsers();
    }
  }, [visible, proposalId]);

  const loadInvitableUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Şehir bilgisini hazırla
      let cityFilter = proposalCity;
      if (selectedProvince && selectedDistrict) {
        const provinceName = PROVINCES.find(p => p.id === selectedProvince)?.name;
        cityFilter = `${selectedDistrict}, ${provinceName}`;
      }

      console.log('Loading users with filters:', {
        city: cityFilter,
        interestId: proposalInterestId,
        minAge,
        maxAge,
        gender: selectedGender,
      });

      const data = await invitationsAPI.getInvitableUsers(proposalId, user.id, {
        city: cityFilter,
        interestId: proposalInterestId,
        minAge,
        maxAge,
        gender: selectedGender,
      });
      
      console.log('Loaded users:', data.length);
      setUsers(data as User[]);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    setShowAdvancedFilters(false);
    setEditingCity(false);
    loadInvitableUsers();
  };

  const clearFilters = () => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setMinAge(18);
    setMaxAge(50);
    setSelectedGender('all');
    setShowFilters(false);
    setShowAdvancedFilters(false);
    setEditingCity(false);
    loadInvitableUsers();
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSendInvitations = async () => {
    if (!user || selectedUsers.size === 0) return;

    setSending(true);
    try {
      await invitationsAPI.inviteUsers(
        proposalId,
        user.id,
        Array.from(selectedUsers)
      );
      
      Alert.alert(
        'Başarılı! 🎉',
        `${selectedUsers.size} kullanıcıya davet gönderildi`,
        [{ text: 'Tamam', onPress: onClose }]
      );
      
      setSelectedUsers(new Set());
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      
      if (error.message?.includes('duplicate')) {
        Alert.alert('Uyarı', 'Bazı kullanıcılar zaten davet edilmiş');
      } else {
        Alert.alert('Hata', 'Davetler gönderilirken bir hata oluştu');
      }
    } finally {
      setSending(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.has(item.id);
    const age = calculateAge(item.birth_date);

    return (
      <TouchableOpacity
        onPress={() => toggleUserSelection(item.id)}
        activeOpacity={0.7}
        style={styles.userCard}
      >
        <View style={styles.userCardContent}>
          {/* Profile Photo with Border */}
          <View style={[styles.photoContainer, isSelected && styles.photoContainerSelected]}>
            <Image
              source={{ uri: item.profile_photo || 'https://via.placeholder.com/80' }}
              style={styles.profilePhoto}
            />
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={28} color="#ec4899" />
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.name}, {age}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="#9ca3af" />
              <Text style={styles.cityText}>{item.city}</Text>
            </View>
          </View>

          {/* Selection Indicator */}
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Filtre Modal - Keşfet sayfası ile aynı tasarım */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowFilters(false);
          setShowAdvancedFilters(false);
          setEditingCity(false);
        }}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay} 
          activeOpacity={1}
          onPress={() => {
            setShowFilters(false);
            setShowAdvancedFilters(false);
            setEditingCity(false);
          }}
        >
          <TouchableOpacity 
            style={styles.filterModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.filterModalHeader}>
              {showAdvancedFilters ? (
                <TouchableOpacity
                  style={styles.backToBasicButton}
                  onPress={() => setShowAdvancedFilters(false)}
                >
                  <ChevronDown size={20} color="#8B5CF6" style={{ transform: [{ rotate: '90deg' }] }} />
                  <Text style={styles.backToBasicButtonText}>Geri</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <Text style={styles.filterModalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => {
                setShowFilters(false);
                setShowAdvancedFilters(false);
                setEditingCity(false);
              }}>
                <X size={22} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView 
              style={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {!showAdvancedFilters ? (
                <>
                  {/* Basit Filtreler */}
                  <Text style={styles.filterDescription}>
                    Varsayılan olarak teklifin şehri ve ilgi alanı kullanılıyor
                  </Text>

                  {/* Gelişmiş Filtre Butonu */}
                  <TouchableOpacity
                    style={styles.advancedFilterButton}
                    onPress={() => setShowAdvancedFilters(true)}
                  >
                    <View style={styles.advancedFilterButtonContent}>
                      <SlidersHorizontal size={20} color="#8B5CF6" />
                      <Text style={styles.advancedFilterButtonText}>Gelişmiş Filtreler</Text>
                    </View>
                    <ChevronDown size={18} color="#8B5CF6" style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Gelişmiş Filtreler */}
                  {/* Şehir */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Şehir</Text>
                    
                    {!editingCity ? (
                      <View style={styles.cityDisplayContainer}>
                        <View style={styles.cityDisplay}>
                          <MapPin size={18} color="#8B5CF6" />
                          <Text style={styles.cityDisplayText}>
                            {selectedProvince && selectedDistrict
                              ? `${selectedDistrict}, ${PROVINCES.find(p => p.id === selectedProvince)?.name}`
                              : proposalCity}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editCityButton}
                          onPress={() => setEditingCity(true)}
                        >
                          <Text style={styles.editCityButtonText}>Değiştir</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.cityEditContainer}>
                        {/* İl Seçimi */}
                        <View style={styles.citySelectGroup}>
                          <Text style={styles.citySelectLabel}>İl</Text>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => {
                              setShowProvinceDropdown(!showProvinceDropdown);
                              setShowDistrictDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownButtonText}>
                              {selectedProvince
                                ? PROVINCES.find(p => p.id === selectedProvince)?.name || 'İl Seç'
                                : 'İl Seç'}
                            </Text>
                            <ChevronDown size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                          
                          {showProvinceDropdown && (
                            <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                              {PROVINCES.map((province) => (
                                <TouchableOpacity
                                  key={province.id}
                                  style={[
                                    styles.dropdownItem,
                                    selectedProvince === province.id && styles.dropdownItemActive,
                                  ]}
                                  onPress={() => {
                                    setSelectedProvince(province.id);
                                    setSelectedDistrict('');
                                    setShowProvinceDropdown(false);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.dropdownItemText,
                                      selectedProvince === province.id && styles.dropdownItemTextActive,
                                    ]}
                                  >
                                    {province.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>

                        {/* İlçe Seçimi */}
                        {selectedProvince && (
                          <View style={styles.citySelectGroup}>
                            <Text style={styles.citySelectLabel}>İlçe</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => {
                                setShowDistrictDropdown(!showDistrictDropdown);
                                setShowProvinceDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownButtonText}>
                                {selectedDistrict || 'İlçe Seç'}
                              </Text>
                              <ChevronDown size={20} color="#8B5CF6" />
                            </TouchableOpacity>
                            
                            {showDistrictDropdown && (
                              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                                {PROVINCES.find(p => p.id === selectedProvince)?.districts.map((district) => (
                                  <TouchableOpacity
                                    key={district}
                                    style={[
                                      styles.dropdownItem,
                                      selectedDistrict === district && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => {
                                      setSelectedDistrict(district);
                                      setShowDistrictDropdown(false);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.dropdownItemText,
                                        selectedDistrict === district && styles.dropdownItemTextActive,
                                      ]}
                                    >
                                      {district}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            )}
                          </View>
                        )}

                        {/* Butonlar */}
                        <View style={styles.cityEditButtons}>
                          <TouchableOpacity
                            style={styles.cityEditCancel}
                            onPress={() => {
                              setEditingCity(false);
                              setShowProvinceDropdown(false);
                              setShowDistrictDropdown(false);
                            }}
                          >
                            <Text style={styles.cityEditCancelText}>İptal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cityEditDone}
                            onPress={() => {
                              if (selectedProvince && selectedDistrict) {
                                setEditingCity(false);
                                setShowProvinceDropdown(false);
                                setShowDistrictDropdown(false);
                              } else {
                                Alert.alert('Uyarı', 'Lütfen il ve ilçe seçin');
                              }
                            }}
                          >
                            <Text style={styles.cityEditDoneText}>Tamam</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Yaş Aralığı */}
                  <View style={styles.filterSection}>
                    <View style={styles.filterLabelRow}>
                      <Text style={styles.filterLabel}>Yaş Aralığı</Text>
                      <Text style={styles.filterValue}>{minAge} - {maxAge}</Text>
                    </View>
                    <View style={styles.ageRangeContainer}>
                      <View style={styles.ageInputRow}>
                        <Text style={styles.ageLabel}>Min:</Text>
                        <View style={styles.ageButtons}>
                          <TouchableOpacity onPress={() => setMinAge(Math.max(18, minAge - 1))} style={styles.ageButton}>
                            <Ionicons name="remove" size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                          <Text style={styles.ageValue}>{minAge}</Text>
                          <TouchableOpacity onPress={() => setMinAge(Math.min(maxAge - 1, minAge + 1))} style={styles.ageButton}>
                            <Ionicons name="add" size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.ageInputRow}>
                        <Text style={styles.ageLabel}>Max:</Text>
                        <View style={styles.ageButtons}>
                          <TouchableOpacity onPress={() => setMaxAge(Math.max(minAge + 1, maxAge - 1))} style={styles.ageButton}>
                            <Ionicons name="remove" size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                          <Text style={styles.ageValue}>{maxAge}</Text>
                          <TouchableOpacity onPress={() => setMaxAge(Math.min(100, maxAge + 1))} style={styles.ageButton}>
                            <Ionicons name="add" size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Cinsiyet */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Cinsiyet</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'all' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('all')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'all' && styles.genderButtonTextActive,
                        ]}>
                          Hepsi
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'male' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('male')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'male' && styles.genderButtonTextActive,
                        ]}>
                          Erkek
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'female' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('female')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'female' && styles.genderButtonTextActive,
                        ]}>
                          Kadın
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={clearFilters}
              >
                <Text style={styles.filterClearButtonText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={applyFilters}
              >
                <Text style={styles.filterApplyButtonText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Ana Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#ec4899', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Kullanıcı Davet Et</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {proposalName}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={styles.filterButton}
              >
                <Ionicons name="options-outline" size={22} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendInvitations}
                disabled={selectedUsers.size === 0 || sending}
                style={[
                  styles.sendButton,
                  (selectedUsers.size === 0 || sending) && styles.sendButtonDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ec4899" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color={selectedUsers.size === 0 ? '#9ca3af' : '#ec4899'} />
                    {selectedUsers.size > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{selectedUsers.size}</Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Selection Summary */}
        {selectedUsers.size > 0 && (
          <View style={styles.selectionSummary}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.selectionText}>
              {selectedUsers.size} kişi seçildi
            </Text>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#ec4899" />
            <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>Davet Edilecek Kullanıcı Yok</Text>
            <Text style={styles.emptyDescription}>
              Aynı şehirde ve ilgi alanında henüz davet edilebilecek kullanıcı bulunmuyor
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10b981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  photoContainerSelected: {
    transform: [{ scale: 1.05 }],
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#f3f4f6',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filtre Modal Styles (Keşfet sayfası ile aynı)
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backToBasicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToBasicButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  filterModalBody: {
    padding: 20,
    maxHeight: 500,
  },
  filterDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  advancedFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  advancedFilterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedFilterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  cityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cityDisplayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  editCityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  editCityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  cityEditContainer: {
    gap: 16,
  },
  citySelectGroup: {
    gap: 8,
  },
  citySelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  dropdownList: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#f3e8ff',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#8B5CF6',
  },
  cityEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cityEditCancel: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cityEditCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  cityEditDone: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cityEditDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  ageRangeContainer: {
    gap: 16,
  },
  ageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    width: 50,
  },
  ageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 40,
    textAlign: 'center',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterClearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
