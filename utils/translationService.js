const { translate } = require('bing-translate-api');

class TranslationService {
    constructor() {
        this.cache = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    async translateWithRetry(text, targetLang, retries = 0) {
        try {
            const result = await translate(text, 'en', targetLang);
            return result.translation;
        } catch (error) {
            if (retries < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, retries);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.translateWithRetry(text, targetLang, retries + 1);
            }
            throw error;
        }
    }

    async translate(text, targetLang = 'hi') {
        if (!text) return text;
        if (text.length > 1000) {
            const chunks = text.match(/.{1,1000}/g) || [];
            const translatedChunks = await Promise.all(
                chunks.map(chunk => this.translateSingle(chunk, targetLang))
            );
            return translatedChunks.join('');
        }
        return this.translateSingle(text, targetLang);
    }

    async translateSingle(text, targetLang) {
        const cacheKey = `${text}_${targetLang}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const translatedText = await this.translateWithRetry(text, targetLang);
            
            if (translatedText) {
                this.cache.set(cacheKey, translatedText);
                return translatedText;
            }
            
            return text;
        } catch (error) {
            console.error('Translation error:', {
                message: error.message,
                text,
                targetLang
            });
            return text;
        }
    }

    async translateCourseData(courseData, targetLang = 'hi') {
        if (!courseData) return courseData;

        try {
            const translatedTitle = await this.translate(courseData.title, targetLang);
            const translatedDescription = await this.translate(courseData.description, targetLang);
            const translatedLevel = await this.translate(courseData.level, targetLang);

            let translatedCurrentModule = null;
            if (courseData.currentModule) {
                translatedCurrentModule = {
                    ...courseData.currentModule,
                    title: await this.translate(courseData.currentModule.title, targetLang)
                };
            }

            let translatedNextLesson = null;
            if (courseData.nextLesson) {
                translatedNextLesson = {
                    ...courseData.nextLesson,
                    moduleTitle: await this.translate(courseData.nextLesson.moduleTitle, targetLang),
                    lessonTitle: await this.translate(courseData.nextLesson.lessonTitle, targetLang)
                };
            }

            const translatedCompletedModules = await Promise.all(
                (courseData.completedModules || []).map(async module => ({
                    ...module,
                    title: await this.translate(module.title, targetLang)
                }))
            );

            return {
                ...courseData,
                title: translatedTitle,
                description: translatedDescription,
                level: translatedLevel,
                currentModule: translatedCurrentModule,
                nextLesson: translatedNextLesson,
                completedModules: translatedCompletedModules
            };
        } catch (error) {
            console.error('Course translation error:', {
                message: error.message,
                courseId: courseData.courseId,
                targetLang
            });
            return courseData;
        }
    }

    async translateEvents(events, targetLang = 'hi') {
        if (!events || !Array.isArray(events)) return events;

        try {
            return await Promise.all(events.map(async event => ({
                ...event,
                title: await this.translate(event.title, targetLang)
            })));
        } catch (error) {
            console.error('Events translation error:', {
                message: error.message,
                targetLang,
                eventCount: events.length
            });
            return events;
        }
    }

    async translateLessonContent(lessonContent, targetLang = 'hi') {
        if (!lessonContent) return lessonContent;

        try {
            // Translate title
            const translatedTitle = await this.translate(lessonContent.title, targetLang);

            // Translate content array
            const translatedContent = await Promise.all(
                lessonContent.content.map(text => this.translate(text, targetLang))
            );

            // Translate questions
            const translatedQuestions = await Promise.all(
                lessonContent.questions.map(async question => ({
                    question: await this.translate(question.question, targetLang),
                    options: await Promise.all(
                        question.options.map(option => this.translate(option, targetLang))
                    ),
                    correctAnswer: question.correctAnswer
                }))
            );

            // Translate type
            const translatedType = await this.translate(lessonContent.type, targetLang);

            return {
                ...lessonContent,
                title: translatedTitle,
                content: translatedContent,
                questions: translatedQuestions,
                type: translatedType,
                isCompleted: lessonContent.isCompleted,
                duration: lessonContent.duration
            };
        } catch (error) {
            console.error('Lesson content translation error:', {
                message: error.message,
                targetLang
            });
            return lessonContent;
        }
    }
}

module.exports = new TranslationService(); 