import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { subscribeToPush } from '../utils/push';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubscribe = async () => {
        try {
            await subscribeToPush();
            alert('Đã bật thông báo thành công!');
        } catch (error) {
            console.error('Lỗi bật thông báo:', error);
            alert('Không thể bật thông báo. Vui lòng cấp quyền trên trình duyệt.');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <Link to="/dashboard" className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
                        AI Học Tập
                    </Link>
                    <Link to="/dashboard" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                        Tổng quan
                    </Link>
                    <Link to="/subjects" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                        Môn học
                    </Link>
                    {user?.role === 'admin' && (
                        <Link to="/admin" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                            Quản trị
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSubscribe}
                        className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        🔔 Bật thông báo
                    </button>

                    {user?.email && (
                        <span className="text-sm text-slate-500 border-l border-slate-200 pl-4">
                            {user.email}
                        </span>
                    )}

                    <button
                        onClick={handleLogout}
                        className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}