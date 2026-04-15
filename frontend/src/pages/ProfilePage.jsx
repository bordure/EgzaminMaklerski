import React from "react";
import { useAuth } from "../AuthContext";
import guestAvatar from "../assets/images/guest-avatar.svg";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-4">
        <img
          src={user?.guest ? guestAvatar : (user?.picture || guestAvatar)}
          alt={user?.name || "Uzytkownik"}
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = guestAvatar; }}
          className={`w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-600 object-cover ${
            user?.guest ? "dark:invert" : ""
          }`}
        />
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {user?.guest ? "Gość" : user?.name}
          </h1>
          {!user?.guest && user?.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
          )}
        </div>
      </div>
    </div>
  );
}
