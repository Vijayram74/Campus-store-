import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageCircle, Send, X, Loader2, User, 
  ChevronLeft, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Chat Button with unread count
export const ChatButton = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      data-testid="chat-button"
    >
      <MessageCircle className="w-6 h-6 text-slate-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Main Chat Dialog
export const ChatDialog = ({ open, onOpenChange, initialReceiverId, initialItemId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const otherUserId = selectedConversation.participant_ids.find(id => id !== user.id);
      await chatAPI.sendMessage({
        receiver_id: otherUserId,
        item_id: selectedConversation.item_id,
        content: newMessage.trim()
      });
      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conv) => {
    const otherId = conv.participant_ids.find(id => id !== user.id);
    return {
      id: otherId,
      name: conv.participant_names[otherId] || 'Unknown',
      avatar: conv.participant_avatars[otherId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] p-0 flex flex-col">
        {!selectedConversation ? (
          // Conversations List
          <>
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : conversations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {conversations.map((conv) => {
                    const other = getOtherParticipant(conv);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className="w-full p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left"
                        data-testid={`conversation-${conv.id}`}
                      >
                        <img
                          src={other.avatar}
                          alt={other.name}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-900 truncate">
                              {other.name}
                            </p>
                            {conv.last_message_at && (
                              <span className="text-xs text-slate-400">
                                {format(new Date(conv.last_message_at), 'MMM d')}
                              </span>
                            )}
                          </div>
                          {conv.item_title && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                              <Package className="w-3 h-3" />
                              {conv.item_title}
                            </p>
                          )}
                          <p className="text-sm text-slate-500 truncate mt-1">
                            {conv.last_message || 'No messages yet'}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <MessageCircle className="w-12 h-12 text-slate-200" />
                  <p className="text-slate-500 mt-2">No conversations yet</p>
                  <p className="text-sm text-slate-400">
                    Start a chat from an item detail page
                  </p>
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          // Chat View
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <img
                src={getOtherParticipant(selectedConversation).avatar}
                alt=""
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  {getOtherParticipant(selectedConversation).name}
                </p>
                {selectedConversation.item_title && (
                  <p className="text-xs text-blue-600">
                    Re: {selectedConversation.item_title}
                  </p>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-slate-100 text-slate-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                data-testid="message-input"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="send-message-btn"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Quick Chat Button for Item Detail
export const StartChatButton = ({ receiverId, receiverName, itemId, itemTitle }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    if (receiverId === user.id) {
      toast.error("You can't message yourself");
      return;
    }

    setLoading(true);
    try {
      await chatAPI.sendMessage({
        receiver_id: receiverId,
        item_id: itemId,
        content: `Hi! I'm interested in "${itemTitle}". Is it still available?`
      });
      toast.success('Message sent! Check your messages.');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (receiverId === user?.id) return null;

  return (
    <Button
      variant="outline"
      onClick={handleStartChat}
      disabled={loading}
      className="flex items-center gap-2"
      data-testid="start-chat-btn"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      Message Seller
    </Button>
  );
};

export default ChatDialog;
