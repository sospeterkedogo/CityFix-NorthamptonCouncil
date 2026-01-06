import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, addDoc, collection, setDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { db } from '../../../src/config/firebase';
import { ChatService } from '../../../src/services/chatService';
import { COLORS, STYLES } from '../../../src/constants/theme';

export default function ChatScreen() {
    const { id: friendId, name: friendName, lastActive } = useLocalSearchParams();
    const { user, userData } = useAuth();
    const router = useRouter();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [roomId, setRoomId] = useState(null);

    // Generic Function to start either call type
    const startCall = async (callType) => {
        // Use a unique ID for every call to ensure fresh state/listeners
        const callId = `${[user.uid, friendId].sort().join('_')}_${Date.now()}`;

        // Generate a Stable Session ID for this specific call instance
        // This persists across refreshes of the call page, preventing "New User" splitting
        const sessionUid = `${user.uid}_${Math.floor(Math.random() * 10000)}`;

        // 1. Create Call Signal Document (Shared State)
        await setDoc(doc(db, 'calls', callId), {
            callerId: user.uid,
            callerName: userData?.username || userData?.name || user.email,
            receiverId: friendId,
            status: 'ringing', // ringing, accepted, rejected, ended
            callType: callType,
            createdAt: Date.now()
        });

        // 2. Send Notification (Trigger Receiver)
        await addDoc(collection(db, 'users', friendId, 'notifications'), {
            title: callType === 'voice' ? "Incoming Voice Call" : "Incoming Video Call",
            body: `${userData?.username || userData?.name || user.displayName || user.email.split('@')[0]} is calling...`,
            type: 'call_invite', // We can use one type and pass mode in data
            callId: callId,
            callMode: callType, // 'voice' or 'video'
            fromId: user.uid,
            read: false,
            createdAt: Date.now()
        });

        // 3. Join the room yourself
        if (Platform.OS === 'web') {
            // HARD RESET ENTRY: Force full browser reload to clear memory/Zego state
            console.log("Hard Resetting into Call Screen...");
            const url = `/(citizen)/call?callId=${callId}&name=${encodeURIComponent(friendName || '')}&type=${callType}&sessionUid=${sessionUid}`;
            window.location.href = url;
        } else {
            router.push({
                pathname: '/(citizen)/call',
                params: { callId, name: friendName, type: callType, sessionUid }
            });
        }
    };

    useEffect(() => {
        setupChat();
    }, [user, friendId]);

    const [friendLastActive, setFriendLastActive] = useState(lastActive);
    const [friendPhoto, setFriendPhoto] = useState(null);

    const setupChat = async () => {
        if (!user || !friendId) return;

        // Get Room ID
        const rId = await ChatService.initializeRoom(user.uid, friendId);
        setRoomId(rId);

        // Subscribe to Messages
        const unsubscribeMessages = ChatService.listenToMessages(rId, (msgs) => {
            setMessages(msgs);
        });

        // Subscribe to Friend's Status & Profile
        const unsubscribeFriend = onSnapshot(doc(db, 'users', friendId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setFriendLastActive(data.lastActive);
                setFriendPhoto(data.photoURL);
            }
        });

        return () => {
            unsubscribeMessages();
            unsubscribeFriend();
        };
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText(''); // Clear UI immediately
        await ChatService.sendMessage(roomId, user.uid, text, friendId, user.name || user.displayName || user.email);
    };

    const renderMessage = ({ item }) => {
        const isMe = item.user._id === user.uid;
        return (
            <View style={[styles.msgContainer, isMe ? styles.msgMe : styles.msgOther]}>
                <Text style={[styles.msgText, isMe ? styles.textMe : styles.textOther]}>
                    {item.text}
                </Text>
                <Text style={styles.timestamp}>
                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[STYLES.container, { padding: 0 }]}>
            <View style={styles.webContainer}>
                {/* Header */}
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/(citizen)/social')} style={{ marginRight: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>

                    {/* User Info - Inline */}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <View>
                            <View style={[styles.avatarSmall, friendPhoto ? { backgroundColor: 'transparent' } : { backgroundColor: COLORS.primary }]}>
                                {friendPhoto ? (
                                    <Image source={{ uri: friendPhoto }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                                        {(friendName ? friendName.charAt(0).toUpperCase() : '?')}
                                    </Text>
                                )}
                            </View>
                            {friendLastActive && (
                                <View style={[styles.onlineDotHeader, {
                                    backgroundColor: (Date.now() - Number(friendLastActive) < 300000) ? COLORS.success : '#ccc'
                                }]} />
                            )}
                        </View>

                        <View style={{ marginLeft: 10 }}>
                            <Text style={[styles.headerTitle, { fontSize: 16, marginBottom: 0 }]}>{friendName || 'Neighbor'}</Text>
                            {friendLastActive && (
                                <Text style={{ fontSize: 10, color: '#666' }}>
                                    {(Date.now() - Number(friendLastActive) < 300000) ? 'Online' : 'Offline'}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Call Buttons */}
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <TouchableOpacity onPress={() => startCall('voice')}>
                            <Ionicons name="call" size={24} color="#22c55e" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => startCall('video')}>
                            <Ionicons name="videocam" size={24} color="#22c55e" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Messages Area */}
                <FlatList
                    style={{ flex: 1 }}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item._id}
                    inverted // Important: Sticks to bottom
                    contentContainerStyle={{ padding: 15 }}
                />

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
                    style={{ backgroundColor: 'white' }}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type a message..."
                            multiline
                        />
                        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                            <Ionicons name="send" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    webContainer: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        flex: 1,
        backgroundColor: 'white', // Ensure background consistency
        ...Platform.select({
            web: {
                boxShadow: '0 0 10px rgba(0,0,0,0.1)'
            }
        })
    },
    header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    avatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    headerTitle: { fontWeight: 'bold', fontSize: 16 },

    msgContainer: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10, ...STYLES.shadow },
    msgMe: { alignSelf: 'flex-end', backgroundColor: COLORS.action, borderBottomRightRadius: 4 },
    msgOther: { alignSelf: 'flex-start', backgroundColor: '#F0F2F5', borderBottomLeftRadius: 4 },

    msgText: { fontSize: 16 },
    textMe: { color: 'white' },
    textOther: { color: '#1C1E21' },

    timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.7 },

    inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, marginRight: 10 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

    onlineDotHeader: {
        position: 'absolute',
        bottom: 0,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: 'white'
    },
    headerSub: { fontSize: 10, color: '#999' }
});