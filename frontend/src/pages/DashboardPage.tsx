import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import client from '../api/client';

interface WeakTopic {
    id: string;
    title: string;
    subjectName: string;
    masteryScore: number;
}

interface TopicToReview extends WeakTopic {
    nextReviewAt: string | null;
}

interface RecentAttempt {
    id: string;
    quizTitle: string;
    subjectName: string;
    score: number;
    attemptedAt: string;
}

interface DashboardData {
    averageScore: number | null;
    totalQuizzesTaken: number;
    weakTopics: WeakTopic[];
    topicsToReview: TopicToReview[];
    recentAttempts: RecentAttempt[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setError(null);
                const { data } = await client.get<DashboardData>('/dashboard');
                setData(data);
            } catch (err) {
                console.error('Lỗi tải dashboard:', err);
                setError('Không thể tải dữ liệu tổng quan. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return <p className="text-slate-400 text-sm text-center py-10">Đang tải tổng quan học tập...</p>;
    }

    if (error || !data) {
        return <p className="text-red-500 text-sm text-center py-10">{error ?? 'Không có dữ liệu'}</p>;
    }

    const chartData = data.weakTopics.map((t) => ({
        name: t.title.length > 18 ? t.title.slice(0, 18) + '…' : t.title,
        fullName: t.title,
        masteryScore: Math.round(t.masteryScore),
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold text-slate-800">Tổng quan học tập</h1>

            {/* Thẻ số liệu tổng quan */}
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-400 mb-1">Điểm trung bình</p>
                    <p className="text-3xl font-semibold text-indigo-600">
                        {data.averageScore !== null ? `${data.averageScore.toFixed(1)}` : '—'}
                        {data.averageScore !== null && <span className="text-base text-slate-400 font-normal"> /100</span>}
                    </p>
                    {data.averageScore === null && (
                        <p className="text-xs text-slate-400 mt-1">Chưa có lượt làm bài nào</p>
                    )}
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-400 mb-1">Tổng số bài đã làm</p>
                    <p className="text-3xl font-semibold text-slate-800">{data.totalQuizzesTaken}</p>
                </div>
            </div>

            {/* Biểu đồ chủ đề còn yếu */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Chủ đề còn yếu (mức độ nắm vững)</h2>
                {chartData.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                        Chưa có dữ liệu chủ đề. Hãy làm vài bài quiz để hệ thống đánh giá mức độ nắm vững.
                    </p>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip
                                formatter={(value) => [`${value}%`, 'Mức độ nắm vững']}
                                labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ''}
                            />
                            <Bar dataKey="masteryScore" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Đề xuất ôn tập tiếp theo */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Nên ôn tập tiếp theo</h2>
                    {data.topicsToReview.length === 0 ? (
                        <p className="text-xs text-slate-400">Chưa có chủ đề nào đến hạn ôn tập.</p>
                    ) : (
                        <ul className="space-y-2.5">
                            {data.topicsToReview.map((t) => (
                                <li key={t.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p className="text-slate-700 font-medium">{t.title}</p>
                                        <p className="text-xs text-slate-400">{t.subjectName}</p>
                                    </div>
                                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md whitespace-nowrap">
                                        {Math.round(t.masteryScore)}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Lịch sử làm bài gần đây */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Kết quả gần đây</h2>
                    {data.recentAttempts.length === 0 ? (
                        <p className="text-xs text-slate-400">Chưa có lượt làm bài nào.</p>
                    ) : (
                        <ul className="space-y-2.5">
                            {data.recentAttempts.map((a) => (
                                <li key={a.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p className="text-slate-700 font-medium">{a.quizTitle}</p>
                                        <p className="text-xs text-slate-400">
                                            {a.subjectName} · {new Date(a.attemptedAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${a.score >= 80
                                            ? 'text-emerald-600 bg-emerald-50'
                                            : a.score >= 50
                                                ? 'text-amber-600 bg-amber-50'
                                                : 'text-red-600 bg-red-50'
                                            }`}
                                    >
                                        {Math.round(a.score)}/100
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="text-center pt-2">
                <Link to="/subjects" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    Xem tất cả môn học →
                </Link>
            </div>
        </div>
    );
}
