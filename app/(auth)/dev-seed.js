import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase'; // Direct access needed for seeding
import { COLORS, STYLES } from '../../src/constants/theme';
import { useRouter } from 'expo-router';


export default function DevSeedScreen() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const router = useRouter();

    const [customEmail, setCustomEmail] = useState('');
    const [customPassword, setCustomPassword] = useState('');
    const [customName, setCustomName] = useState('');
    const [customRole, setCustomRole] = useState('citizen');

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const createStaffAccount = async (email, password, name, role) => {
        try {
            addLog(`Creating ${role}: ${email}...`);
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Create Firestore Profile
            await setDoc(doc(db, 'users', uid), {
                name,
                email,
                role,
                createdAt: Date.now(),
                // Specific fields for Engineer
                ...(role === 'engineer' ? { status: 'Available' } : {})
            });

            addLog(`Success: ${email} (UID: ${uid.slice(0, 5)}...)`);
            return true;
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                addLog(`User ${email} already exists. Skipping.`);
            } else {
                addLog(`Error creating ${email}: ${error.message}`);
            }
            return false;
        }
    };

    const handleCustomCreate = async () => {
        if (!customEmail || !customPassword || !customName || !customRole) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        const success = await createStaffAccount(customEmail, customPassword, customName, customRole);
        setLoading(false);

        if (success) {
            Alert.alert("Success", "User created successfully!");
            setCustomEmail('');
            setCustomPassword('');
            setCustomName('');
            setCustomRole('');
        }
    };

    const seedTickets = async () => {
        setLoading(true);
        addLog("Creating test tickets...");
        try {
            // 1. Create a Resolved Ticket
            await addDoc(collection(db, 'tickets'), {
                userId: 'system_seed',
                userName: 'Council Bot',
                status: 'resolved',
                type: 'social',
                title: 'Pothole Fixed',
                description: 'We fixed the pothole on Main St.',
                createdAt: serverTimestamp(),
                category: 'Highways',
                location: { latitude: 52.2405, longitude: -0.9027 },
                address: 'Market Square, Northampton',
                imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
                likes: 5,
                upvoteCount: 10
            });
            addLog("Created 'Resolved' Ticket");

            // 2. Create a Verified Ticket
            await addDoc(collection(db, 'tickets'), {
                userId: 'system_seed',
                userName: 'Council Bot',
                status: 'verified',
                title: 'Fly Tipping Reported',
                description: 'Report verified and scheduled for playing.',
                createdAt: serverTimestamp(),
                category: 'Environment',
                location: { latitude: 52.235, longitude: -0.9 },
                address: 'Abington Park',
                imageUrl: 'https://images.unsplash.com/photo-1530587222861-b33c6c1d480a?auto=format&fit=crop&w=800&q=80',
                likes: 2,
                upvoteCount: 3
            });
            addLog("Created 'Verified' Ticket");

            Alert.alert("Success", "Test tickets created!");
        } catch (e) {
            console.error(e);
            addLog(`Error seeding tickets: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        setLoading(true);
        setLogs([]);

        await createStaffAccount('dispatcher@cityfix.com', 'password123', 'Head Dispatcher', 'dispatcher');
        await createStaffAccount('eng@cityfix.com', 'password123', 'Bob The Builder', 'engineer');
        await createStaffAccount('qa@cityfix.com', 'password123', 'Karen Auditor', 'qa');
        await createStaffAccount('citizen@cityfix.com', 'password123', 'John Citizen', 'citizen');

        setLoading(false);
        Alert.alert("Seeding Complete", "You can now log in with these accounts.");
    };

    const handleExit = async () => {
        await signOut(auth);
        router.replace('/(auth)/login');
    };

    return (
        <ScrollView contentContainerStyle={STYLES.container}>
            <Text style={styles.header}>🛠️ Developer Seeding Tool</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Create Custom User</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={customEmail}
                    onChangeText={setCustomEmail}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={customPassword}
                    onChangeText={setCustomPassword}
                    secureTextEntry
                />
                <TextInput
                    style={styles.input}
                    placeholder="Name / Title"
                    value={customName}
                    onChangeText={setCustomName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Role (citizen, dispatcher, engineer, qa)"
                    value={customRole}
                    onChangeText={setCustomRole}
                    autoCapitalize="none"
                />

                <TouchableOpacity style={styles.btn} onPress={handleCustomCreate} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>CREATE USER</Text>}
                </TouchableOpacity>
            </View>

            <View style={[styles.section, { marginTop: 30 }]}>
                <Text style={styles.sectionTitle}>Batch Seed Defaults</Text>
                <Text style={styles.sub}>
                    Creates: Dispatcher, Engineer, QA.
                </Text>

                <TouchableOpacity style={[styles.btn, { backgroundColor: '#555' }]} onPress={handleSeed} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>GENERATE DEFAULTS</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, { backgroundColor: '#2E8B57', marginTop: 10 }]} onPress={seedTickets} disabled={loading}>
                    <Text style={styles.btnText}>SEED RESOLVED/VERIFIED TICKETS</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.logBox}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Logs:</Text>
                {logs.map((log, i) => <Text key={i} style={{ fontSize: 12, marginBottom: 2 }}>{log}</Text>)}
            </View>

            <TouchableOpacity
                style={styles.backBtn}
                onPress={handleExit}
            >
                <Text style={styles.backText}>← Log Out & Return to Login</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: { fontSize: 24, fontWeight: 'bold', color: COLORS.error, marginBottom: 20 },
    sub: { fontSize: 13, color: '#666', marginBottom: 10 },
    section: { width: '100%', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: COLORS.primary },
    input: { backgroundColor: 'white', padding: 10, borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
    btn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold' },
    logBox: { marginTop: 20, padding: 15, backgroundColor: '#eee', borderRadius: 8, minHeight: 100, width: '100%' },
    backBtn: {
        marginTop: 20,
        padding: 15,
        alignItems: 'center',
    },
    backText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    }
});