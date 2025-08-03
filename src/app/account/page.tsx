"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfile {
  name: string;
  email: string;
  joinDate: string;
  isVip: boolean;
  subscriptionStatus: 'active' | 'inactive' | 'expired';
  nextBillingDate?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    setTimeout(() => {
      setUser({
        name: 'Ahmed Alshughri',
        email: 'alshughriahmed@gmail.com',
        joinDate: '2024-01-15',
        isVip: true,
        subscriptionStatus: 'active',
        nextBillingDate: '2024-02-15'
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    router.push('/');
  };

  const handleCancelSubscription = () => {
    alert('Subscription cancellation requested. You will receive a confirmation email.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please log in to access your account.</p>
          <Link 
            href="/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Account Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your DitonaChat account and preferences</p>
            </div>
            <div className="flex items-center space-x-4">
              {user.isVip && (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                  VIP Member
                </span>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'profile', label: 'Profile Settings' },
                { id: 'subscription', label: 'Subscription' },
                { id: 'billing', label: 'Billing Info' },
                { id: 'security', label: 'Security' },
                { id: 'history', label: 'Session History' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={user.name}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                  <input
                    type="text"
                    value={new Date(user.joinDate).toLocaleDateString()}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                  <input
                    type="text"
                    value={user.isVip ? 'VIP Member' : 'Free Member'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Subscription Status</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">VIP Membership</h3>
                    <p className="text-blue-700">Status: {user.subscriptionStatus}</p>
                    {user.nextBillingDate && (
                      <p className="text-blue-700">Next billing: {new Date(user.nextBillingDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">$9.99/month</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">VIP Benefits:</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Priority matching</li>
                  <li>Ad-free experience</li>
                  <li>Advanced statistics</li>
                  <li>Custom filters</li>
                  <li>Session history access</li>
                </ul>
                <button
                  onClick={handleCancelSubscription}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing Information</h2>
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-gray-600">**** **** **** 4242</p>
                  <p className="text-gray-600">Expires: 12/25</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">VIP Subscription - January 2024</span>
                      <span className="font-semibold">$9.99</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">VIP Subscription - December 2023</span>
                      <span className="font-semibold">$9.99</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Password</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200">
                    Change Password
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <p className="text-gray-600 mb-2">Add an extra layer of security to your account</p>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200">
                    Enable 2FA
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Active Sessions</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600">Current session - Chrome on Windows</p>
                    <p className="text-sm text-gray-500">Last active: Now</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Session History</h2>
              {user.isVip ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">Video Chat Session</p>
                        <p className="text-gray-600">Duration: 15 minutes</p>
                      </div>
                      <p className="text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">Random Chat Session</p>
                        <p className="text-gray-600">Duration: 8 minutes</p>
                      </div>
                      <p className="text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Session history is available for VIP members only</p>
                  <Link
                    href="/upgrade"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    Upgrade to VIP
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
