import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants/theme';
import { SocialService } from '../services/socialService';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

export default function FeedCard({ ticket }) {
    const { user } = useAuth();
    const [likes, setLikes] = useState(ticket.voteCount || 0); // Likes (Heart)
    const [isLiked, setIsLiked] = useState(false);
    const [upvotes, setUpvotes] = useState(ticket.upvoteCount || 0); // Upvotes (Arrow)
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [commentCount, setCommentCount] = useState(ticket.commentCount || 0);
    const [showComments, setShowComments] = useState(false); // Modal visibility
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [showFullScreen, setShowFullScreen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (user && ticket.id) {
            SocialService.checkUserLiked(ticket.id, user.uid).then(setIsLiked);
            SocialService.checkUserUpvoted(ticket.id, user.uid).then(setIsUpvoted);
            fetchComments(); // Fetch comments on mount for inline display
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

    // Just fetch data, don't open modal
    const fetchComments = async () => {
        if (!ticket.id) return;
        const data = await SocialService.getComments(ticket.id);
        setComments(data);
        setCommentCount(data.length); // Sync count with consistency
    };

    // Open Modal
    const openCommentsModal = () => {
        fetchComments(); // Refresh to be safe
        setShowComments(true);
    };

    const postComment = async () => {
        if (!newComment.trim()) return;

        const name = user.displayName || 'Citizen';
        const avatar = user.photoURL || null;

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticComment = {
            id: tempId,
            userId: user.uid,
            userName: name,
            userAvatar: avatar,
            text: newComment,
            createdAt: Date.now(),
            isFlagged: false
        };

        setComments(prev => [optimisticComment, ...prev]);
        setCommentCount(prev => prev + 1);
        setNewComment('');

        await SocialService.addComment(ticket.id, user.uid, name, optimisticComment.text, avatar);
        fetchComments(); // Refresh real data and valid count
    };

    if (!ticket || !ticket.id) return null; // Don't render invalid tickets

    // --- Dynamic Feed Logic ---
    const getStatusConfig = (status) => {
        switch (status) {
            case 'in_progress':
                return {
                    icon: '👷',
                    title: 'Work in Progress',
                    subtitle: `Engineer working on ${ticket.title}`,
                    badge: 'IN PROGRESS',
                    badgeColor: '#FFA500', // Orange
                    image: ticket.photos?.[0] // Show BEFORE photo
                };
            case 'verified':
                return {
                    icon: '✅',
                    title: 'Fix Deployed',
                    subtitle: 'Pending final QA check',
                    badge: 'PENDING QA',
                    badgeColor: '#3498db', // Blue
                    image: ticket.afterPhoto || ticket.photos?.[0] // Show AFTER (or fallback)
                };
            case 'resolved':
                return {
                    icon: '🏆',
                    title: 'Officially Closed',
                    subtitle: 'Issue resolved & verified',
                    badge: 'RESOLVED',
                    badgeColor: COLORS.success, // Green
                    image: ticket.afterPhoto || ticket.photos?.[0]
                };
            default:
                return {
                    icon: '🔧',
                    title: 'Status Update',
                    subtitle: ticket.title,
                    badge: status?.toUpperCase(),
                    badgeColor: '#999',
                    image: ticket.photos?.[0]
                };
        }
    };

    const config = getStatusConfig(ticket.status);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}><Text style={{ fontSize: 18 }}>{config.icon}</Text></View>
                <View>
                    <Text style={styles.username}>{config.title}</Text>
                    <Text style={styles.location}>
                        {config.subtitle} • {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            {/* Image Section */}
            <TouchableOpacity onPress={() => setShowFullScreen(true)} activeOpacity={0.9} style={{ position: 'relative' }}>
                <Image
                    source={{ uri: config.image }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Status Badge Overlay */}
                <View style={[styles.statusBadge, { backgroundColor: config.badgeColor }]}>
                    <Text style={styles.statusBadgeText}>{config.badge}</Text>
                </View>
            </TouchableOpacity>

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
                <TouchableOpacity style={styles.actionBtn} onPress={openCommentsModal}>
                    <Ionicons name="chatbubble-outline" size={26} color="#666" />
                    <Text style={styles.actionText}>{commentCount > 0 ? commentCount : 0}</Text>
                </TouchableOpacity>
            </View>

            {/* Caption */}
            <View style={styles.captionBox}>
                <Text numberOfLines={3}>
                    <Text style={{ fontWeight: 'bold' }}>{ticket.status === 'in_progress' ? 'Report: ' : 'Resolution: '}</Text>
                    {ticket.status === 'in_progress'
                        ? (ticket.description || "No description provided.")
                        : (ticket.resolutionNotes || "Issue resolved.")}
                </Text>
            </View>

            {/* INLINE COMMENTS SECTION */}
            <View style={styles.inlineCommentsSection}>
                {commentCount > 3 && (
                    <TouchableOpacity onPress={openCommentsModal}>
                        <Text style={styles.viewAllText}>View all {commentCount} comments</Text>
                    </TouchableOpacity>
                )}

                {comments.slice(0, 3).map(comment => (
                    <View key={comment.id} style={styles.inlineCommentRow}>
                        <Text numberOfLines={2}>
                            <Text style={styles.commentUser}>{comment.userName} </Text>
                            <Text style={styles.commentText}>{comment.isFlagged ? '[Flagged]' : comment.text}</Text>
                        </Text>
                    </View>
                ))}

                {/* Inline Input */}
                <View style={styles.inlineInputRow}>
                    <Ionicons name="person-circle-outline" size={30} color="#ccc" />
                    <TouchableOpacity onPress={openCommentsModal} style={{ flex: 1 }}>
                        <Text style={[styles.inlineInput, { color: '#999', paddingTop: 10 }]}>Add a comment...</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* COMMENTS MODAL (Bottom Sheet Style) */}
            <Modal visible={showComments} animationType="slide" transparent={true} onRequestClose={() => setShowComments(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowComments(false)}>
                                <Text style={{ color: 'red', fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Comments</Text>
                            <View style={{ width: 50 }} />
                        </View>

                        <FlatList
                            data={comments}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item }) => (
                                <View style={[styles.commentRow, item.isFlagged && { opacity: 0.5 }]}>
                                    {item.userAvatar ? (
                                        <Image source={{ uri: item.userAvatar }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                                    ) : (
                                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee', marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12 }}>{item.userName?.charAt(0).toUpperCase() || '👤'}</Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text>
                                            <Text style={styles.commentUser}>{item.userName} </Text>
                                            <Text style={styles.commentText}>{item.isFlagged ? '[Flagged for Review]' : item.text}</Text>
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                    {!item.isFlagged && (
                                        <TouchableOpacity onPress={() => handleFlag(item.id)}>
                                            <Ionicons name="flag-outline" size={14} color="#ccc" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No comments yet.</Text>}
                        />

                        {/* Input Area */}
                        <View style={styles.inputRow}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatarSmall} />
                            ) : (
                                <View style={styles.avatarSmall}><Text>{user?.displayName?.charAt(0).toUpperCase() || '😎'}</Text></View>
                            )}
                            <TextInput
                                style={styles.input}
                                placeholder="Add a comment..."
                                value={newComment}
                                onChangeText={setNewComment}
                                autoFocus={true}
                            />
                            <TouchableOpacity onPress={postComment} disabled={!newComment.trim()}>
                                <Text style={{ fontWeight: 'bold', color: newComment.trim() ? COLORS.primary : '#ccc', fontSize: 16 }}>Post</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* FULL SCREEN IMAGE MODAL */}
            < Modal visible={showFullScreen} animationType="fade" transparent={true} onRequestClose={() => setShowFullScreen(false)}>
                <View style={styles.fsContainer}>
                    {/* Top Bar */}
                    <View style={styles.fsTopBar}>
                        <TouchableOpacity onPress={() => setShowFullScreen(false)} style={styles.iconBtn}>
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.iconBtn}>
                            <Ionicons name="ellipsis-vertical" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Menu Overlay (Absolute) */}
                    {showMenu && (
                        <View style={styles.menuOverlay}>
                            <TouchableOpacity style={styles.menuItem} onPress={handleSaveImage}>
                                <Ionicons name="save-outline" size={20} color={COLORS.text.primary} />
                                <Text style={styles.menuText}>Save Image</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={handleViewMore}>
                                <Ionicons name="information-circle-outline" size={20} color={COLORS.text.primary} />
                                <Text style={styles.menuText}>View Details</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Main Image */}
                    <View style={styles.fsImageWrapper}>
                        <Image
                            source={{ uri: config.image }}
                            style={styles.fsImage}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Bottom Action Bar */}
                    <View style={styles.fsBottomBar}>
                        {/* Like */}
                        <TouchableOpacity style={styles.fsActionBtn} onPress={handleLike}>
                            <Text style={{ fontSize: 24 }}>{isLiked ? '❤️' : '🤍'}</Text>
                            <Text style={styles.fsActionText}>{likes}</Text>
                        </TouchableOpacity>

                        {/* Upvote */}
                        <TouchableOpacity style={styles.fsActionBtn} onPress={handleUpvote}>
                            <Ionicons
                                name={isUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                                size={28}
                                color={isUpvoted ? COLORS.action : 'white'}
                            />
                            <Text style={[styles.fsActionText, isUpvoted && { color: COLORS.action }]}>{upvotes}</Text>
                        </TouchableOpacity>

                        {/* Comment */}
                        <TouchableOpacity style={styles.fsActionBtn} onPress={() => { setShowFullScreen(false); openCommentsModal(); }}>
                            <Ionicons name="chatbubble-outline" size={26} color="white" />
                            <Text style={styles.fsActionText}>{commentCount}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal >
        </View >
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

    // Status Badge
    statusBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
    },
    statusBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 10, letterSpacing: 1 },

    // Modal / Bottom Sheet
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: 'white', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
    modalHeader: { padding: 15, borderBottomWidth: 0.5, borderColor: '#ccc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontWeight: 'bold', fontSize: 16 },

    commentRow: { flexDirection: 'row', padding: 15, alignItems: 'flex-start' },
    commentUser: { fontWeight: 'bold' },
    commentText: { lineHeight: 18 },

    inputRow: {
        flexDirection: 'row', padding: 15, borderTopWidth: 0.5, borderColor: '#ccc', alignItems: 'center', gap: 10,
        marginBottom: 10 // Keyboard spacing if needed
    },
    input: { flex: 1, backgroundColor: 'transparent', fontSize: 16, padding: 5 },
    avatarSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },

    // Full Screen Styles
    fsContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
    fsTopBar: {
        position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10,
        flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20
    },
    fsBottomBar: {
        position: 'absolute', bottom: 40, left: 0, right: 0, zIndex: 10,
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 15, marginHorizontal: 20, borderRadius: 30
    },
    fsImageWrapper: { flex: 1, justifyContent: 'center' },
    fsImage: { width: '100%', height: '100%' },
    iconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
    fsActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fsActionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Menu Overlay
    menuOverlay: {
        position: 'absolute', top: 90, right: 20, zIndex: 20,
        backgroundColor: 'white', borderRadius: 12, padding: 5, width: 160,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    menuText: { fontSize: 14, color: COLORS.text.primary, fontWeight: '500' },

    // Inline Comments
    inlineCommentsSection: { paddingHorizontal: 15, paddingBottom: 15 },
    viewAllText: { color: '#999', marginBottom: 5, fontSize: 13 },
    inlineCommentRow: { marginBottom: 4, flexDirection: 'row' },
    inlineInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    inlineInput: { flex: 1, marginLeft: 10, fontSize: 14, padding: 0, height: 40 },
});