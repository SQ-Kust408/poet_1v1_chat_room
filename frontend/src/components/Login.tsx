import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { authApi } from '../services/api';

const LoginContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #f0f2f5;
`;

const StyledCard = styled(Card)`
    width: 400px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
    text-align: center;
    margin-bottom: 24px;
`;

interface LoginProps {
    onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);

    const handleSubmit = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const response = isRegister
                ? await authApi.register(values.username, values.password)
                : await authApi.login(values.username, values.password);
            
            localStorage.setItem('token', response.access_token);
            onLogin(response.access_token);
            message.success(isRegister ? '注册成功' : '登录成功');
        } catch (error) {
            message.error(isRegister ? '注册失败' : '登录失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginContainer>
            <StyledCard>
                <Title>{isRegister ? '注册' : '登录'}</Title>
                <Form
                    name="login"
                    onFinish={handleSubmit}
                    autoComplete="off"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="用户名"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                        >
                            {isRegister ? '注册' : '登录'}
                        </Button>
                    </Form.Item>

                    <Button
                        type="link"
                        block
                        onClick={() => setIsRegister(!isRegister)}
                    >
                        {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
                    </Button>
                </Form>
            </StyledCard>
        </LoginContainer>
    );
};

export default Login; 