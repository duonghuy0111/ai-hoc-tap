import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

interface Question {
    id: string;
    questionType: 'mcq' | 'essay';
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
}

interface QuizDetail {
    id: string;
    title: string;
    questions: Question[]
}

export default function QuizTakingPage() {
    const { id: subjectId, quizId } = useParams<{ id: string; quizId: string }>();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState<QuizDetail | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!subjectId || !quizId) return;
        setLoading(true);
        client.get(`/subjects/${subjectId}/quizzes/${quizId}`)
            .then((res) => {
                setQuiz(res.data);
                setError(null);
            })
            .catch((err) => {
                console.error('Lỗi tải quiz:', err);
                setError(err.response?.data?.message || 'Không thể tải nội dung bài kiểm tra');
            })
            .finally(() => setLoading(false));
    }, [subjectId, quizId]);

    function selectAnswer(questionId: string, option: string) {
        setAnswers((prev) => ({ ...prev, [questionId]: option }));
    }

    async function handleSubmit() {
        if (!quiz || !subjectId || !quizId) return;
        setSubmitting(true);
        try {
            const payload = {
                answers: quiz.questions.map((q) => ({
                    questionId: q.id,
                    selected: answers[q.id]?.trim() ?? '',
                })),
            };
            const { data } = await client.post(`/subjects/${subjectId}/quizzes/${quizId}/submit`, payload);
            navigate(`/subjects/${subjectId}/quizzes/${quizId}/result`, { state: data });
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Có lỗi xảy ra khi nộp bài');
            setSubmitting(false);
        }
    }

    if (loading) {
        return <p className="text-slate-400 text-sm text-center py-10">Đang tải bài kiểm tra...</p>;
    }

    if (error || !quiz) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center space-y-3">
                <p className="text-red-600 text-sm">{error || 'Không tìm thấy bài kiểm tra'}</p>
                <Link to={`/subjects/${subjectId}/quizzes`} className="text-sm font-medium text-indigo-600 hover:underline">
                    ← Quay lại danh sách bài kiểm tra
                </Link>
            </div>
        );
    }

    const answeredCount = quiz.questions.filter((q) => {
        const val = answers[q.id];
        return val !== undefined && val.trim().length > 0;
    }).length;

    const allAnswered = answeredCount === quiz.questions.length;

    return (
        <div className="space-y-6">
            {/* Header thông tin bài làm */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center sticky top-4 z-10">
                <div>
                    <h1 className="text-base font-semibold text-slate-800">{quiz.title}</h1>
                    <p className="text-xs text-slate-500">
                        Tiến độ: <span className="font-semibold text-indigo-600">{answeredCount}/{quiz.questions.length}</span> câu
                    </p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                >
                    {submitting ? 'Đang chấm điểm...' : 'Nộp bài'}
                </button>
            </div>

            {/* Danh sách câu hỏi */}
            <div className="space-y-4">
                {quiz.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-start gap-2">
                            <span className="font-semibold text-indigo-600 text-sm">{idx + 1}.</span>
                            <p className="font-medium text-slate-800 text-sm flex-1 leading-relaxed">{q.question}</p>
                        </div>

                        {q.questionType === 'mcq' ? (
                            <div className="grid gap-2 pt-1">
                                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                    const text = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }[opt];
                                    const isSelected = answers[q.id] === opt;
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => selectAnswer(q.id, opt)}
                                            className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-2 ${isSelected
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium shadow-sm'
                                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {opt}
                                            </span>
                                            <span className="flex-1">{text}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <textarea
                                value={answers[q.id] ?? ''}
                                onChange={(e) => selectAnswer(q.id, e.target.value)}
                                disabled={submitting}
                                placeholder="Nhập câu trả lời ngắn của bạn tại đây (2-4 câu)..."
                                rows={4}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Button nộp bài ở cuối trang */}
            <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors disabled:opacity-40 shadow-sm"
            >
                {submitting ? 'Đang nộp bài & chấm điểm...' : allAnswered ? 'Nộp bài ngay' : `Còn ${quiz.questions.length - answeredCount} câu chưa hoàn thành`}
            </button>
        </div>
    );
}