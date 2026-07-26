'use client';

import { useState } from 'react';
import { useAdmin } from './components/useAdmin';
import { AdminHeader } from './components/AdminHeader';
import { CreateUserForm } from './components/CreateUserForm';
import { UsersList } from './components/UsersList';
import { AdminModals } from './components/AdminModals';
import { AdminCardReports } from './components/AdminCardReports';

export default function AdminPage() {
  const a = useAdmin();
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');

  if (a.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-700 font-extrabold text-sm animate-pulse">Đang xác thực quyền Quản trị...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-100 p-3 md:p-6 font-sans select-none flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        
        {/* HEADER VỚI THANH TAB */}
        <AdminHeader
          adminRole={a.adminRole}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={() => a.router.push('/dashboard')}
        />

        {/* CỘT NỘI DUNG THEO TAB */}
        {activeTab === 'users' ? (
          <>
            {/* FORM TẠO USER */}
            <CreateUserForm
              newDisplayName={a.newDisplayName}
              setNewDisplayName={a.setNewDisplayName}
              newEmail={a.newEmail}
              setNewEmail={a.setNewEmail}
              newPassword={a.newPassword}
              setNewPassword={a.setNewPassword}
              isCreating={a.isCreating}
              onGeneratePass={a.generateRandomPassword}
              onSubmit={a.handleCreateUser}
            />

            {/* DANH SÁCH USER */}
            <UsersList
              usersList={a.filteredUsers}
              currentAdminId={a.currentAdmin?.id}
              adminRole={a.adminRole}
              searchTerm={a.searchTerm}
              setSearchTerm={a.setSearchTerm}
              onOpenResetModal={a.setResetModalUser}
              onOpenLockModal={a.openLockModal}
              onToggleRole={a.handleToggleRole}
              onDeleteUser={a.handleDeleteUser}
            />
          </>
        ) : (
          /* TAB DANH SÁCH THẺ BÁO LỖI */
          <AdminCardReports currentAdminId={a.currentAdmin?.id} />
        )}

      </div>

      {/* POPUP MODALS */}
      <AdminModals
        resetModalUser={a.resetModalUser}
        setResetModalUser={a.setResetModalUser}
        resetPasswordVal={a.resetPasswordVal}
        setResetPasswordVal={a.setResetPasswordVal}
        isResetting={a.isResetting}
        handleResetPassword={a.handleResetPassword}
        lockModalUser={a.lockModalUser}
        setLockModalUser={a.setLockModalUser}
        lockSettings={a.lockSettings}
        setLockSettings={a.setLockSettings}
        selectedLockedCourses={a.selectedLockedCourses}
        setSelectedLockedCourses={a.setSelectedLockedCourses}
        lockDuration={a.lockDuration}
        setLockDuration={a.setLockDuration}
        isSavingLock={a.isSavingLock}
        courseOptions={a.courseOptions}
        handleSaveLock={a.handleSaveLock}
      />
    </main>
  );
}