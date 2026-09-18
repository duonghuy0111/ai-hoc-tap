import { useLocation, useParams, Link } from 'react-router-dom';

interface AnswerDetail {
    questionId: string;
    questionType: 'mcq' | 'essay';
    selected: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    scorePercent: number;
    feedback?: string;
    correctPoints?: string[];
    missingPoints?: string[];
    suggestion?: string;
    explanation: string;
}

interface ResultState {
    score: number;
    totalQuestions: number;
    correctCount: number;
    details: AnswerDetail[];
    masteryScore: number | null;
}

export default function QuizResultPage() {
    const { id: subjectId } = useParams<{ id: string }>();
    const location = useLocation();
    const result = location.state as ResultState | undefined;

    if (!result) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm text-center space-y-3">
                <p className="text-slate-500 text-sm">
                    Không tìm thấy dữ liệu kết quả (do F5 hoặc truy cập trực tiếp).
                </p>
                <Link
                    to={`/subjects/${subjectId}/quizzes`}
                    className="inline-block text-sm font-medium text-indigo-600 hover:underline"
                >
                    ← Quay lại danh sách bài kiểm tra
                </Link>
            </div>
        );
    }

    const isPassed = result.score >= 70;

    return (
        <div className="space-y-6">
            {/* Thẻ tổng quan kết quả */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center space-y-2">
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                    Kết quả bài làm
                </span>
                <p className={`text-4xl font-bold ${isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {result.score.toFixed(0)}%
                </p>
                <p className="text-slate-600 text-sm font-medium">
                    Đúng {result.correctCount}/{result.totalQuestions} câu
                </p>
                {result.masteryScore !== null && (
                    <p className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-2 inline-block">
                        Mức độ nắm vững chủ đề: <span className="font-semibold text-slate-600">{result.masteryScore.toFixed(0)}%</span>
                    </p>
                )}
            </div>

            {/* Chi tiết từng câu hỏi */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-slate-800">Chi tiết đáp án & nhận xét</h2>

                {result.details.map((d, idx) => (
                    <div
                        key={d.questionId}
                        className={`p-4 rounded-xl border text-sm space-y-2 transition-all ${d.isCorrect
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                            : 'bg-rose-50/50 border-rose-200 text-slate-800'
                            }`}
                    >
                        <div className="flex items-center justify-between font-medium">
                            <span className="flex items-center gap-1.5">
                                {d.isCorrect ? '✅' : '❌'} Câu {idx + 1}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${d.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                {d.scorePercent.toFixed(0)}%
                            </span>
                        </div>

                        {/* Câu hỏi Trắc nghiệm */}
                        {d.questionType === 'mcq' ? (
                            !d.isCorrect && (
                                <p className="text-xs text-slate-600">
                                    <span className="font-semibold text-rose-700">Bạn chọn:</span> {d.selected ?? '(không chọn)'} —{' '}
                                    <span className="font-semibold text-emerald-700">Đáp án đúng:</span> {d.correctAnswer}
                                </p>
                            )
                        ) : (
                            /* Câu hỏi Tự luận */
                            <div className="space-y-1.5 text-xs">
                                <p className="text-slate-700">
                                    <span className="font-semibold">Câu trả lời của bạn:</span> {d.selected || '(để trống)'}
                                </p>
                                {d.feedback && (
                                    <div className="text-indigo-800 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-100">
                                        💡 <span className="font-semibold">Nhận xét AI:</span> {d.feedback}
                                    </div>
                                )}
                                {d.correctPoints && d.correctPoints.length > 0 && (
                                    <div className="text-emerald-800 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                                        <span className="font-semibold block mb-1">✅ Ý đã trả lời đúng:</span>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {d.correctPoints.map((point, i) => (
                                                <li key={i}>{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {d.missingPoints && d.missingPoints.length > 0 && (
                                    <div className="text-amber-800 bg-amber-50/80 p-2.5 rounded-lg border border-amber-100">
                                        <span className="font-semibold block mb-1">⚠️ Nội dung còn thiếu/chưa đầy đủ:</span>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {d.missingPoints.map((point, i) => (
                                                <li key={i}>{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {d.suggestion && (
                                    <div className="text-sky-800 bg-sky-50/80 p-2.5 rounded-lg border border-sky-100">
                                        🎯 <span className="font-semibold">Gợi ý cải thiện:</span> {d.suggestion}
                                    </div>
                                )}
                                {!d.isCorrect && (
                                    <p className="text-slate-600">
                                        <span className="font-semibold text-emerald-700">Đáp án tham khảo:</span> {d.correctAnswer}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Giải thích chi tiết */}
                        {d.explanation && (
                            <div className="pt-2 text-xs text-slate-500 border-t border-slate-200/60">
                                <span className="font-medium text-slate-600">Giải thích:</span> {d.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="text-center pt-2">
                <Link
                    to={`/subjects/${subjectId}/quizzes`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    ← Quay lại danh sách bài kiểm tra
                </Link>
            </div>
        </div>
    );
}