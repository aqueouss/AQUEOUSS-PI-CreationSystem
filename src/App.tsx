import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, ConfigProvider, theme, Switch, Avatar, Dropdown, Space, Drawer, App as AntdApp } from "antd";
import { 
  DashboardOutlined, 
  FileAddOutlined, 
  LogoutOutlined, 
  SettingOutlined, 
  MenuOutlined,
  UserOutlined,
  BulbOutlined,
  BulbFilled
} from "@ant-design/icons";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { PICreation } from "./components/PICreation";
import { User } from "./types";
import { getApiUrl, setApiUrl } from "./config";
import { isMockMode, setMockMode } from "./api";

const { Header, Sider, Content } = Layout;

export const App: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Temp settings states
  const [tempUrl, setTempUrl] = useState<string>(getApiUrl());
  const [tempMock, setTempMock] = useState<boolean>(isMockMode());

  // Restore user session if exists
  useEffect(() => {
    const savedUser = localStorage.getItem("AQUEOUSS_USER");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("AQUEOUSS_USER");
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem("AQUEOUSS_USER", JSON.stringify(loggedInUser));
  };


  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("AQUEOUSS_USER");
    message.success("Logged out successfully");
  };

  const handleSaveSettings = () => {
    setApiUrl(tempUrl);
    setMockMode(tempMock);
    message.success("Settings updated!");
    setSettingsOpen(false);
    // Reload dashboard stats if logged in
    if (user) {
      window.location.reload();
    }
  };

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "create-pi",
      icon: <FileAddOutlined />,
      label: "Create PI",
    },
  ];

  // Responsive Drawer Menu for Mobile
  const renderDrawerMenu = () => (
    <Drawer
      title="AQUEOUSS"
      placement="left"
      onClose={() => setMobileMenuOpen(false)}
      open={mobileMenuOpen}
      bodyStyle={{ padding: 0 }}
      width={250}
    >
      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        onClick={({ key }) => {
          setActiveTab(key);
          setMobileMenuOpen(false);
        }}
        items={menuItems}
      />
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
        <Button 
          type="primary" 
          danger 
          icon={<LogoutOutlined />} 
          block 
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </Drawer>
  );

  if (!user) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <AntdApp>
          <Login onLoginSuccess={handleLoginSuccess} />
        </AntdApp>
      </ConfigProvider>
    );
  }

  const userMenu = (
    <Menu
      items={[
        {
          key: "settings",
          icon: <SettingOutlined />,
          label: "API Settings",
          onClick: () => {
            setTempUrl(getApiUrl());
            setTempMock(isMockMode());
            setSettingsOpen(true);
          }
        },
        {
          type: "divider"
        },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Logout",
          danger: true,
          onClick: handleLogout
        }
      ]}
    />
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0ea5e9", // Sky Blue Aqueouss brand theme
          fontFamily: "var(--font-family)",
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <Layout style={{ minHeight: "100vh" }} className={darkMode ? "dark-theme" : ""}>
          {/* Sidebar for Desktop */}
          <Sider
            breakpoint="lg"
            collapsedWidth="0"
            trigger={null}
            style={{
              background: darkMode ? "#121824" : "#ffffff",
              borderRight: `1px solid ${darkMode ? "var(--border-dark)" : "var(--border-light)"}`
            }}
          >
            <div style={{ 
              height: 64, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              borderBottom: `1px solid ${darkMode ? "var(--border-dark)" : "var(--border-light)"}`,
              padding: "0 16px"
            }}>
              <h1 style={{ 
                fontFamily: "var(--font-brand)", 
                fontSize: "1.4rem", 
                fontWeight: 800, 
                color: "var(--primary-color)",
                margin: 0,
                letterSpacing: "0.5px"
              }}>
                AQUEOUSS
              </h1>
            </div>
            <Menu
              mode="inline"
              selectedKeys={[activeTab]}
              style={{ borderRight: 0, marginTop: 16 }}
              onClick={({ key }) => setActiveTab(key)}
              items={menuItems}
            />
          </Sider>

          <Layout>
            {/* Header Layout */}
            <Header style={{ 
              background: darkMode ? "#121824" : "#ffffff", 
              padding: "0 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              borderBottom: `1px solid ${darkMode ? "var(--border-dark)" : "var(--border-light)"}`
            }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ fontSize: "16px", display: "inline-block" }}
                className="lg-hidden" // Handle custom breakpoint hidden behavior via CSS
              />
              
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
                {/* Dark mode switch */}
                <Switch
                  checked={darkMode}
                  onChange={(checked) => setDarkMode(checked)}
                  checkedChildren={<BulbFilled />}
                  unCheckedChildren={<BulbOutlined />}
                />

                {/* User Dropdown */}
                <Dropdown overlay={userMenu} placement="bottomRight" trigger={["click"]}>
                  <Space style={{ cursor: "pointer" }}>
                    <Avatar style={{ backgroundColor: "var(--primary-color)" }} icon={<UserOutlined />} />
                    <span style={{ fontWeight: 500, color: darkMode ? "#f8fafc" : "#0f172a" }}>
                      {user.name} ({user.role})
                    </span>
                  </Space>
                </Dropdown>
              </div>
            </Header>

            {/* Main Content Layout */}
            <Content style={{ 
              margin: "24px", 
              padding: "24px", 
              minHeight: 280, 
              background: darkMode ? "#090d16" : "#f8fafc",
              borderRadius: "var(--border-radius)"
            }}>
              {activeTab === "dashboard" ? (
                <Dashboard 
                  currentUser={user} 
                  onNavigateToCreate={() => setActiveTab("create-pi")} 
                />
              ) : (
                <PICreation 
                  currentUser={user} 
                  onGenerationSuccess={() => setActiveTab("dashboard")} 
                />
              )}
            </Content>
          </Layout>
        </Layout>

        {/* Mobile Menu Drawer */}
        {renderDrawerMenu()}

        {/* Global API Settings Settings Modal */}
        <Drawer
          title="Application Settings"
          placement="right"
          onClose={() => setSettingsOpen(false)}
          open={settingsOpen}
          width={380}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <div>
              <h4>Sandbox Mode</h4>
              <Switch 
                checked={tempMock} 
                onChange={(checked) => setTempMock(checked)} 
                style={{ marginTop: 8 }}
              />
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary-light)", marginTop: 4 }}>
                Enable to use simulated mock data rather than connecting to Google Sheets.
              </p>
            </div>

            {!tempMock && (
              <div>
                <h4>Google Sheets Web App URL</h4>
                <input 
                  type="text" 
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "8px", 
                    borderRadius: 6, 
                    border: `1px solid ${darkMode ? "var(--border-dark)" : "var(--border-light)"}`,
                    background: darkMode ? "#1e293b" : "#ffffff",
                    color: darkMode ? "#f8fafc" : "#0f172a",
                    marginTop: 8
                  }}
                  placeholder="https://script.google.com/macros/s/..."
                />
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary-light)", marginTop: 4 }}>
                  Enter the deployment URL of your Google Apps Script Web App.
                </p>
              </div>
            )}

            <Button type="primary" block onClick={handleSaveSettings} className="btn-primary-grad">
              Save Settings
            </Button>
          </Space>
        </Drawer>
      </AntdApp>
    </ConfigProvider>
  );
};
export default App;
