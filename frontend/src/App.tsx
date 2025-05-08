import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import ChatRoom from './components/ChatRoom';
import Login from './components/Login';
import SearchBar from './components/SearchBar';
import { chatApi } from './services/api';
import { Message } from './types';
import 'antd/dist/antd.css';

const { Content } = Layout;

function App() {
  const [poets, setPoets] = useState<string[]>([]);
  const [selectedPoet, setSelectedPoet] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      loadPoets();
    }
  }, []);

  const loadPoets = async () => {
    try {
      const poetsList = await chatApi.getPoets();
      setPoets(poetsList);
    } catch (error) {
      console.error('加载诗人列表失败:', error);
      message.error('加载诗人列表失败');
    }
  };

  const handleLogin = (token: string) => {
    setIsAuthenticated(true);
    loadPoets();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedPoet(null);
    setSearchResults([]);
  };

  const handleSearch = (messages: Message[]) => {
    setSearchResults(messages);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Content>
        <SearchBar onSearch={handleSearch} />
        <ChatRoom
          selectedPoet={selectedPoet}
          poets={poets}
          onSelectPoet={setSelectedPoet}
          searchResults={searchResults}
          onLogout={handleLogout}
        />
      </Content>
    </Layout>
  );
}

export default App; 