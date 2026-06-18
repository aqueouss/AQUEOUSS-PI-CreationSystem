import React, { useState } from "react";
import { Form, Input, Button, Switch, Alert, App } from "antd";
import { UserOutlined, LockOutlined, LinkOutlined, SettingOutlined } from "@ant-design/icons";
import { login, isMockMode, setMockMode } from "../api";
import { getApiUrl, setApiUrl } from "../config";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [useMock, setUseMock] = useState(isMockMode());

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);
      message.success(`Welcome back, ${result.user.name}!`);
      onLoginSuccess(result.user);
    } catch (err: any) {
      message.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    setApiUrl(apiUrl);
    setMockMode(useMock);
    message.success("API Settings saved successfully!");
    setShowSettings(false);
  };

  return (
    <div className="login-container">
      <div className="login-box fade-in-entry">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ 
            fontFamily: "var(--font-brand)", 
            color: "#ffffff", 
            fontSize: "2.5rem", 
            fontWeight: 800, 
            letterSpacing: "1px",
            margin: 0
          }}>
            AQUEOUSS
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "0.9rem", marginTop: 4 }}>
            Proforma Invoice Management System
          </p>
        </div>

        {useMock && (
          <Alert
            message="Running in Demo / Sandbox Mode"
            description="Use admin@aqueouss.com (password: admin123) or emp@aqueouss.com (password: emp123) to log in."
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {!showSettings ? (
          <Form name="login-form" layout="vertical" onFinish={handleLogin} autoComplete="off">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Please enter your email!" },
                { type: "email", message: "Please enter a valid email!" }
              ]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: "rgba(255, 255, 255, 0.25)" }} />} 
                placeholder="Email Address" 
                size="large"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff"
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Please enter your password!" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(255, 255, 255, 0.25)" }} />}
                placeholder="Password"
                size="large"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff"
                }}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                block 
                loading={loading}
                className="btn-primary-grad"
              >
                Sign In
              </Button>
            </Form.Item>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button 
                type="link" 
                icon={<SettingOutlined />} 
                onClick={() => setShowSettings(true)}
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                Configure API / Sheets URL
              </Button>
            </div>
          </Form>
        ) : (
          <div style={{ color: "#ffffff" }}>
            <h3 style={{ marginBottom: 16, fontFamily: "var(--font-brand)" }}>Settings</h3>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>Sandbox / Mock Mode</span>
                <Switch 
                  checked={useMock} 
                  onChange={(checked) => setUseMock(checked)} 
                />
              </div>
              <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.45)" }}>
                Enable to test features instantly with mock local storage database.
              </p>
            </div>

            {!useMock && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ display: "block", marginBottom: 8 }}>Google Apps Script URL</span>
                <Input
                  prefix={<LinkOutlined style={{ color: "rgba(255, 255, 255, 0.25)" }} />}
                  value={apiUrl}
                  onChange={(e) => setApiUrlState(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff"
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <Button block onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button type="primary" block onClick={saveSettings} className="btn-primary-grad">
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
