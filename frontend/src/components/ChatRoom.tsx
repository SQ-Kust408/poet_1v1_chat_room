import React, { useState, useEffect, useRef } from 'react';
import { Layout, List, Input, Button, Card, Avatar, message, Tooltip, Table } from 'antd';
import { SendOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { Message, PoetInfo } from '../types';
import { chatApi } from '../services/api';
import { debounce } from 'lodash';

const { Header, Sider, Content } = Layout;

const StyledLayout = styled(Layout)`
    height: calc(100vh - 64px);
`;

const StyledSider = styled(Sider)`
    background: #fff;
    padding: 20px;
`;

const ChatContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

const MessageList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
`;

const InputContainer = styled.div`
    display: flex;
    padding: 20px;
    background: #fff;
    border-top: 1px solid #e8e8e8;
`;

const PoetInfo = styled(Card)`
    margin: 20px;
    overflow-y: auto;
    max-height: calc(100vh - 104px);
`;

const HeaderContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
`;

interface ChatRoomProps {
    selectedPoet: string | null;
    poets: string[];
    onSelectPoet: (poet: string) => void;
    searchResults: Message[];
    onLogout: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
    selectedPoet: initialSelectedPoet,
    poets,
    onSelectPoet,
    searchResults,
    onLogout
}) => {
    const [poetInfo, setPoetInfo] = useState<PoetInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const messageListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialSelectedPoet) {
            loadChatHistory();
            loadPoetInfo();
        }
    }, [initialSelectedPoet]);

    useEffect(() => {
        if (searchResults.length > 0) {
            setMessages(searchResults);
        }
    }, [searchResults]);

    const loadChatHistory = async () => {
        if (initialSelectedPoet) {
            try {
                const history = await chatApi.getChatHistory(initialSelectedPoet);
                setMessages(history);
                scrollToBottom();
            } catch (error) {
                message.error('加载聊天历史失败');
            }
        }
    };

    const loadPoetInfo = async () => {
        if (initialSelectedPoet) {
            try {
                const info = await chatApi.getPoetInfo(initialSelectedPoet);
                setPoetInfo(info);
            } catch (error) {
                message.error('加载诗人信息失败');
            }
        }
    };

    const handleSend = async () => {
        if (!initialSelectedPoet || !inputValue.trim()) return;

        setLoading(true);
        const userMessage: Message = {
            role: 'user',
            content: inputValue,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        scrollToBottom();

        try {
            const response = await chatApi.sendMessage(initialSelectedPoet, inputValue);
            const botMessage: Message = {
                role: 'assistant',
                content: response.response,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMessage]);
            scrollToBottom();
        } catch (error) {
            message.error('发送消息失败');
        } finally {
            setLoading(false);
        }
    };

    const debouncedSend = debounce(handleSend, 300);

    const scrollToBottom = () => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const getPoetBasicInfo = () => {
        if (!poetInfo || !poetInfo.basic_info) return null;
        return poetInfo.basic_info;
    };

    const getPoetWorks = () => {
        if (!poetInfo || !poetInfo.works) return [];
        return [{ name: poetInfo.works, relation_to_poet: '代表作品' }];
    };

    const getPoetRelations = () => {
        if (!poetInfo || !poetInfo.relations) return [];
        return poetInfo.relations.map(relation => ({
            name: relation.name,
            relation_to_poet: relation.relation_to_poet
        }));
    };

    const getPoetPlaces = () => {
        if (!poetInfo || !poetInfo.places) return [];
        return poetInfo.places.map(place => ({
            name: place.name,
            relation_to_poet: place.relation_to_poet
        }));
    };

    return (
        <StyledLayout>
            <StyledSider width={200}>
                <List
                    dataSource={poets}
                    renderItem={poet => (
                        <List.Item
                            onClick={() => onSelectPoet(poet)}
                            style={{
                                cursor: 'pointer',
                                background: initialSelectedPoet === poet ? '#e6f7ff' : 'transparent'
                            }}
                        >
                            {poet}
                        </List.Item>
                    )}
                />
            </StyledSider>
            
            <Layout>
                <HeaderContainer>
                    <h2>{initialSelectedPoet ? `与${initialSelectedPoet}对话` : '请选择一位诗人'}</h2>
                    <Tooltip title="退出登录">
                        <Button
                            type="text"
                            icon={<LogoutOutlined />}
                            onClick={onLogout}
                        />
                    </Tooltip>
                </HeaderContainer>
                
                <Content style={{ display: 'flex' }}>
                    <ChatContainer style={{ flex: 1, borderRight: '1px solid #e8e8e8' }}>
                        <MessageList ref={messageListRef}>
                            {messages.map((message, index) => (
                                <Card
                                    key={index}
                                    style={{
                                        marginBottom: 16,
                                        textAlign: message.role === 'user' ? 'right' : 'left'
                                    }}
                                >
                                    <Card.Meta
                                        avatar={
                                            <Avatar icon={message.role === 'user' ? <UserOutlined /> : undefined} />
                                        }
                                        title={
                                            <div>
                                                {message.role === 'user' ? '你' : initialSelectedPoet}
                                                <span style={{ fontSize: '12px', color: '#999', marginLeft: 8 }}>
                                                    {formatTime(message.timestamp)}
                                                </span>
                                            </div>
                                        }
                                        description={message.content}
                                    />
                                </Card>
                            ))}
                        </MessageList>
                        <InputContainer>
                            <Input
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onPressEnter={debouncedSend}
                                placeholder="输入消息..."
                                style={{ marginRight: 8 }}
                                disabled={!initialSelectedPoet || loading}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={debouncedSend}
                                loading={loading}
                                disabled={!initialSelectedPoet}
                            >
                                发送
                            </Button>
                        </InputContainer>
                    </ChatContainer>
                    
                    <Sider width={400} style={{ background: '#fff', padding: '20px' }}>
                        {poetInfo && (
                            <PoetInfo title={`${initialSelectedPoet}的知识图谱`}>
                                <h3>基本信息</h3>
                                {getPoetBasicInfo() && (
                                    <>
                                        <p>朝代：{getPoetBasicInfo()?.dynasty}</p>
                                        <p>生卒年：{getPoetBasicInfo()?.birth_year} - {getPoetBasicInfo()?.death_year}</p>
                                        <p>称号：{getPoetBasicInfo()?.title}</p>
                                        <p>代表作品：{getPoetBasicInfo()?.works}</p>
                                    </>
                                )}

                                <h3 style={{ marginTop: 20 }}>重要作品</h3>
                                <List
                                    size="small"
                                    dataSource={getPoetWorks()}
                                    renderItem={work => (
                                        <List.Item>
                                            <div>
                                                <strong>{work.name}</strong>
                                                <p style={{ fontSize: '12px', color: '#666' }}>{work.relation_to_poet}</p>
                                            </div>
                                        </List.Item>
                                    )}
                                />

                                <h3 style={{ marginTop: 20 }}>重要关系</h3>
                                <List
                                    size="small"
                                    dataSource={getPoetRelations()}
                                    renderItem={relation => (
                                        <List.Item>
                                            <div>
                                                <strong>{relation.name}</strong>
                                                <p style={{ fontSize: '12px', color: '#666' }}>{relation.relation_to_poet}</p>
                                            </div>
                                        </List.Item>
                                    )}
                                />

                                <h3 style={{ marginTop: 20 }}>重要地点</h3>
                                <List
                                    size="small"
                                    dataSource={getPoetPlaces()}
                                    renderItem={place => (
                                        <List.Item>
                                            <div>
                                                <strong>{place.name}</strong>
                                                <p style={{ fontSize: '12px', color: '#666' }}>{place.relation_to_poet}</p>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            </PoetInfo>
                        )}
                    </Sider>
                </Content>
            </Layout>
        </StyledLayout>
    );
};

export default ChatRoom; 