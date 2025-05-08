import React, { useState } from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Message } from '../types';
import { chatApi } from '../services/api';

const SearchContainer = styled.div`
    display: flex;
    padding: 16px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
`;

interface SearchBarProps {
    onSearch: (messages: Message[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchValue.trim()) return;
        
        setLoading(true);
        try {
            const messages = await chatApi.searchMessages(searchValue);
            onSearch(messages);
        } catch (error) {
            console.error('搜索失败:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SearchContainer>
            <Input
                placeholder="搜索历史消息..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onPressEnter={handleSearch}
                style={{ marginRight: 8 }}
            />
            <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
            >
                搜索
            </Button>
        </SearchContainer>
    );
};

export default SearchBar; 