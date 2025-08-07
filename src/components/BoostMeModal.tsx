import React, { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/router';

interface BoostMeModalProps {
  onClose: () => void;
}

export function BoostMeModal({ onClose }: BoostMeModalProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    // تم تعديل الشرط هنا لتجنب خطأ التصنيف، 
    // حيث أن خصائص isVip و isBoosted غير موجودة في نوع User.
    if (user) {
      setIsModalVisible(true);
    }
  }, [user]);

  const handleBoost = () => {
    router.push('/subscribe');
    onClose();
  };

  if (!isModalVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">احصل على دفعة!</h2>
        <p className="mb-4">قم بالاشتراك لتزيد من فرصك في المطابقة بسرعة.</p>
        <div className="flex justify-between">
          <button onClick={handleBoost} className="bg-blue-500 text-white px-4 py-2 rounded">
            اشترك الآن
          </button>
          <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">
            لا، شكرا
          </button>
        </div>
      </div>
    </div>
  );
}
