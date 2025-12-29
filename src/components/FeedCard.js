import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants/theme';
import { SocialService } from '../services/socialService';
import { useAuth } from '../context/AuthContext';

export default function FeedCard({ ticket }) {
    const { user } = useAuth();
    const [likes, setLikes] = useState(ticket.voteCount || 0); // Likes (Heart)
    const [isLiked, setIsLiked] = useState(false);
    const [upvotes, setUpvotes] = useState(ticket.upvoteCount || 0); // Upvotes (Arrow)
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [commentCount, setCommentCount] = useState(ticket.commentCount || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (user && ticket.id) {
            SocialService.checkUserLiked(ticket.id, user.uid).then(setIsLiked);
            SocialService.checkUserUpvoted(ticket.id, user.uid).then(setIsUpvoted);
        }
    }, [ticket.id, user]);

    const handleLike = async () => {
        if (!ticket.id) return;
        setIsLiked(!isLiked);
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        await SocialService.toggleLike(ticket.id, user.uid);
    };

    const handleUpvote = async () => {
        if (!ticket.id) return;
        setIsUpvoted(!isUpvoted);
        setUpvotes(prev => isUpvoted ? prev - 1 : prev + 1);
        await SocialService.toggleUpvote(ticket.id, user.uid);
    };

    const loadComments = async () => {
        if (!ticket.id) return;
        const data = await SocialService.getComments(ticket.id);
        setComments(data);
        setShowComments(true);
    };

    const postComment = async () => {
        if (!newComment.trim()) return;
        // user.displayName might be null if strictly using email auth, fallbacks to 'Citizen'
        const name = user.displayName || 'Citizen';
        await SocialService.addComment(ticket.id, user.uid, name, newComment);
        setNewComment('');
        setCommentCount(prev => prev + 1); // Optimistic update
        loadComments(); // Refresh
    };

    const handleFlag = (commentId) => {
        Alert.alert("Report Comment", "Flag this content as inappropriate?", [
            { text: "Cancel" },
            {
                text: "Report", onPress: async () => {
                    await SocialService.flagComment(ticket.id, commentId);
                    Alert.alert("Thank you", "Content flagged for moderation.");
                }
            }
        ]);
    };

    if (!ticket || !ticket.id) return null; // Don't render invalid tickets

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}><Text>👷</Text></View>
                <View>
                    <Text style={styles.username}>Fixed by Council</Text>
                    <Text style={styles.location}>
                        {ticket.title} • {ticket.verifiedAt ? new Date(ticket.verifiedAt).toLocaleDateString() : 'Just now'}
                    </Text>
                </View>
            </View>

            {/* Image (Show "After" photo if exists, else "Before") */}
            <Image
                source={{ uri: ticket.afterPhoto || ticket.photos[0] }}
                style={styles.image}
                resizeMode="cover"
            />

            {/* Action Bar */}
            <View style={styles.actionBar}>
                {/* Like Button (Heart) */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                    <Text style={{ fontSize: 24, color: isLiked ? 'red' : 'black' }}>{isLiked ? '❤️' : '🤍'}</Text>
                    <Text style={[styles.actionText, isLiked && { color: 'red' }]}>{likes}</Text>
                </TouchableOpacity>

                {/* Upvote Button (Arrow) */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleUpvote}>
                    <Ionicons
                        name={isUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                        size={28}
                        color={isUpvoted ? COLORS.action : '#666'}
                    />
                    <Text style={[styles.actionText, isUpvoted && { color: COLORS.action }]}>{upvotes}</Text>
                </TouchableOpacity>

                {/* Comment Button */}
                <TouchableOpacity style={styles.actionBtn} onPress={loadComments}>
                    <Ionicons name="chatbubble-outline" size={26} color="#666" />
                    <Text style={styles.actionText}>{commentCount > 0 ? commentCount : 0}</Text>
                </TouchableOpacity>
            </View>

            {/* Caption */}
            <View style={styles.captionBox}>
                <Text numberOfLines={2}>
                    <Text style={{ fontWeight: 'bold' }}>Resolution: </Text>
                    {ticket.resolutionNotes || "Issue resolved."}
                </Text>
            </View>

            {/* COMMENTS MODAL */}
            <Modal visible={showComments} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Comments</Text>
                        <TouchableOpacity onPress={() => setShowComments(false)}><Text style={{ color: 'blue' }}>Close</Text></TouchableOpacity>
                    </View>

                    <FlatList
                        data={comments}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={[styles.commentRow, item.isFlagged && { opacity: 0.5 }]}>
                                <Text style={styles.commentUser}>{item.userName}: </Text>
                                <Text style={styles.commentText}>{item.isFlagged ? '[Flagged for Review]' : item.text}</Text>
                                {!item.isFlagged && (
                                    <TouchableOpacity onPress={() => handleFlag(item.id)}>
                                        <Text style={{ fontSize: 10, color: '#999', marginLeft: 10 }}>⚐</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No comments yet.</Text>}
                    />

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Add a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                        />
                        <TouchableOpacity onPress={postComment}>
                            <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: 'white', marginBottom: 20, ...STYLES.shadow },
    header: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    username: { fontWeight: 'bold' },
    location: { fontSize: 12, color: '#666' },
    image: { width: '100%', height: 300, backgroundColor: '#f0f0f0' },
    actionBar: { flexDirection: 'row', padding: 10, gap: 15 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontWeight: '600' },
    captionBox: { paddingHorizontal: 10, paddingBottom: 15 },

    modalContainer: { flex: 1, paddingTop: 20 },
    modalHeader: { padding: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
    modalTitle: { fontWeight: 'bold', fontSize: 16 },
    commentRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#f9f9f9', alignItems: 'center' },
    commentUser: { fontWeight: 'bold' },
    commentText: { flex: 1 },
    inputRow: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center', gap: 10 },
    input: { flex: 1, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 20 },
});