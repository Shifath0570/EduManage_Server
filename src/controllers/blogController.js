const Blog = require('../models/Blog');

/**
 * Default Seed Blogs if DB is empty
 */
const INITIAL_SEED_BLOGS = [
    {
        title: "The Importance of Quality Education",
        slug: "the-importance-of-quality-education",
        description: "Discover how quality education helps students build a strong foundation for their academic and personal growth.",
        category: "Education",
        author: "School Administration",
        authorEmail: "admin@edumanage.com",
        image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
        tags: ["Education", "Learning", "Academic", "Future"],
        status: "published",
        featured: true,
        views: 142,
        content: `Quality education plays an important role in shaping the future of students and society. It provides students with the knowledge, skills, confidence, and values they need to succeed in life.

A good educational environment encourages students to ask questions, explore new ideas, solve problems, and develop critical thinking skills. Schools play an important role in creating this environment through experienced teachers, modern facilities, and effective learning methods.

Education is not only about academic results. It also helps students develop communication skills, leadership abilities, teamwork, creativity, discipline, and responsibility.

Our school focuses on providing students with a safe, inclusive, and inspiring environment where every student gets the opportunity to learn and grow.

By combining quality teaching, modern technology, extracurricular activities, and personal guidance, we aim to prepare our students for higher education, professional careers, and responsible citizenship.`
    },
    {
        title: "How Technology Is Changing Education",
        slug: "how-technology-is-changing-education",
        description: "Learn how modern technology is transforming classrooms and creating better learning experiences for students.",
        category: "Technology",
        author: "Technology Department",
        authorEmail: "admin@edumanage.com",
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop",
        tags: ["Technology", "Innovation", "Digital Learning", "Smart Classroom"],
        status: "published",
        featured: false,
        views: 98,
        content: `Technology has become an important part of modern education. Digital tools are helping teachers provide more interactive and engaging learning experiences.

Online resources, digital classrooms, smart boards, educational applications, and learning management systems allow students to access educational materials more easily.

Technology also makes it easier for teachers to monitor student performance and identify areas where students may need additional support.

However, technology should be used as a tool to support teachers and students rather than completely replacing traditional learning methods.

Our goal is to use technology responsibly to make education more accessible, engaging, and effective for every student.`
    },
    {
        title: "Building a Better Learning Environment",
        slug: "building-a-better-learning-environment",
        description: "A positive and supportive learning environment can improve student engagement, confidence, and performance.",
        category: "Learning",
        author: "Academic Department",
        authorEmail: "admin@edumanage.com",
        image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop",
        tags: ["Classroom", "Motivation", "Wellbeing", "Growth"],
        status: "published",
        featured: false,
        views: 84,
        content: `A positive learning environment is essential for student success. Students learn better when they feel safe, respected, supported, and motivated.

Teachers can create a better classroom environment by encouraging participation, respecting different opinions, and providing constructive feedback.

Schools should also provide comfortable classrooms, modern learning resources, libraries, laboratories, sports facilities, and opportunities for extracurricular activities.

When students feel connected to their school community, they become more confident and motivated to participate in academic and social activities.

Building a better learning environment is a shared responsibility between students, teachers, parents, and school administrators.`
    },
    {
        title: "The Role of Teachers in Student Success",
        slug: "the-role-of-teachers-in-student-success",
        description: "Teachers play an important role in guiding students and helping them achieve their academic goals.",
        category: "Teachers",
        author: "Teacher Development Team",
        authorEmail: "admin@edumanage.com",
        image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop",
        tags: ["Teachers", "Mentorship", "Pedagogy", "Inspiration"],
        status: "published",
        featured: false,
        views: 110,
        content: `Teachers are one of the most important parts of the education system. They guide students academically and help them develop important life skills.

An effective teacher understands that every student is different. Students have different learning styles, interests, strengths, and challenges.

Teachers can help students reach their potential by providing individual guidance, meaningful feedback, and encouragement.

Beyond academic lessons, teachers also help students develop discipline, communication, teamwork, leadership, and problem-solving skills.

A strong relationship between teachers and students creates a supportive environment where students feel comfortable asking questions and seeking help.`
    },
    {
        title: "Preparing Students for the Future",
        slug: "preparing-students-for-the-future",
        description: "Explore how schools can prepare students with the skills they need to succeed in a rapidly changing world.",
        category: "Future",
        author: "Career Development Team",
        authorEmail: "admin@edumanage.com",
        image: "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=1200&auto=format&fit=crop",
        tags: ["Future Skills", "Career", "Innovation", "Preparation"],
        status: "published",
        featured: false,
        views: 76,
        content: `The world is changing rapidly, and students need more than traditional academic knowledge to succeed in the future.

Schools should help students develop communication, creativity, critical thinking, collaboration, digital literacy, and problem-solving skills.

Students should also get opportunities to participate in projects, competitions, clubs, presentations, and other practical activities.

Career guidance can help students understand different career opportunities and make informed decisions about their future.

Our education system aims to prepare students not only for examinations but also for real-world challenges and opportunities.`
    },
    {
        title: "Why Extracurricular Activities Matter",
        slug: "why-extracurricular-activities-matter",
        description: "Extracurricular activities help students develop teamwork, leadership, communication, and creativity.",
        category: "Activities",
        author: "Student Activities Department",
        authorEmail: "admin@edumanage.com",
        image: "https://images.unsplash.com/photo-1636202339022-7d67f7447e3a?q=80&w=1471&auto=format&fit=crop",
        tags: ["Activities", "Sports", "Arts", "Teamwork"],
        status: "published",
        featured: false,
        views: 92,
        content: `Extracurricular activities are an important part of a student's overall development. They provide opportunities to learn outside the traditional classroom.

Sports, cultural programs, debates, science clubs, programming clubs, art, music, and volunteer activities can help students discover their interests and talents.

Participation in these activities teaches students teamwork, leadership, discipline, communication, and time management.

These activities also help students build friendships and develop confidence in social situations.

For this reason, our school encourages students to participate in a wide range of extracurricular activities alongside their academic studies.`
    }
];

/**
 * Helper to generate URL slug from title
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * Call Google Gemini REST API
 */
async function callGemini(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }

    const models = [
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite'
    ];

    let lastError = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2500
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text.trim();
            } else {
                const errData = await response.text();
                lastError = new Error(`Gemini (${model}) error: ${response.status} - ${errData}`);
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('All Gemini models failed to generate content');
}

/**
 * GET /api/blogs
 * Fetch all published blogs (or all blogs for admin) with search & category filter
 */
exports.getAllBlogs = async (req, res) => {
    try {
        const { category, search, status, tag, featured, page = 1, limit = 50 } = req.query;
        const role = (req.user?.role || req.headers['x-user-role'] || req.query?.userRole || '').toLowerCase().trim();
        const isAdmin = role === 'admin';

        // Auto-seed if database has no blogs yet
        const count = await Blog.countDocuments();
        if (count === 0) {
            try {
                await Blog.insertMany(INITIAL_SEED_BLOGS);
            } catch (seedErr) {
                console.error('Auto-seed blogs error:', seedErr);
            }
        }

        const filter = {};

        // Only show published blogs to public, unless admin requests drafts
        if (!isAdmin) {
            filter.status = 'published';
        } else if (status && status !== 'all') {
            filter.status = status;
        }

        if (category && category !== 'All') {
            const escapedCategory = category.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            filter.category = { $regex: new RegExp(`^${escapedCategory}$`, 'i') };
        }

        if (tag && tag !== 'All') {
            const escapedTag = tag.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            filter.tags = { $regex: new RegExp(`^${escapedTag}$`, 'i') };
        }

        if (featured !== undefined) {
            filter.featured = featured === 'true';
        }

        if (search && search.trim()) {
            const term = search.trim();
            const safeTerm = term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            const words = term.split(/\s+/).filter(Boolean).map(w => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
            const searchTerms = Array.from(new Set([safeTerm, ...words]));
            const regexList = searchTerms.map(t => new RegExp(t, 'i'));

            filter.$or = [
                { title: { $in: regexList } },
                { tags: { $in: regexList } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Blog.countDocuments(filter);
        const blogs = await Blog.find(filter)
            .sort({ featured: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: blogs
        });
    } catch (error) {
        console.error('Error in getAllBlogs:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch blogs'
        });
    }
};

/**
 * GET /api/blogs/:id
 * Get single blog by MongoDB _id or slug (and increment views)
 */
exports.getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        let blog = null;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            blog = await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
        }

        if (!blog) {
            blog = await Blog.findOneAndUpdate({ slug: id }, { $inc: { views: 1 } }, { new: true });
        }

        // Fallback check by numerical index or title slug match
        if (!blog && !isNaN(Number(id))) {
            const index = Number(id) - 1;
            const all = await Blog.find({ status: 'published' }).sort({ createdAt: 1 });
            if (all[index]) {
                blog = await Blog.findByIdAndUpdate(all[index]._id, { $inc: { views: 1 } }, { new: true });
            }
        }

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog article not found'
            });
        }

        res.status(200).json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error('Error in getBlogById:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch blog details'
        });
    }
};

/**
 * POST /api/blogs
 * Create new blog (Admin only)
 */
exports.createBlog = async (req, res) => {
    try {
        const role = (req.user?.role || req.headers['x-user-role'] || req.body?.userRole || '').toLowerCase().trim();
        if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Only administrators can create or publish blogs.'
            });
        }

        const {
            title,
            description,
            content,
            category = 'Education',
            author = 'School Administration',
            authorEmail,
            image,
            tags,
            status = 'published',
            featured = false
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Blog title is required.' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Blog content is required.' });
        }

        const cleanSlug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
        const parsedTags = Array.isArray(tags)
            ? tags
            : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);

        const newBlog = new Blog({
            title: title.trim(),
            slug: cleanSlug,
            description: description?.trim() || content.trim().slice(0, 160) + '...',
            content: content.trim(),
            category: category.trim(),
            author: author.trim() || 'School Administration',
            authorEmail: authorEmail || req.user?.email || 'admin@edumanage.com',
            image: image?.trim() || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop',
            tags: parsedTags,
            status,
            featured: Boolean(featured)
        });

        await newBlog.save();

        res.status(201).json({
            success: true,
            message: 'Blog published successfully!',
            data: newBlog
        });
    } catch (error) {
        console.error('Error in createBlog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create blog'
        });
    }
};

/**
 * PUT /api/blogs/:id
 * Update blog (Admin only)
 */
exports.updateBlog = async (req, res) => {
    try {
        const role = (req.user?.role || req.headers['x-user-role'] || req.body?.userRole || '').toLowerCase().trim();
        if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Only administrators can edit blogs.'
            });
        }

        const { id } = req.params;
        const {
            title,
            description,
            content,
            category,
            author,
            authorEmail,
            image,
            tags,
            status,
            featured
        } = req.body;

        const updateData = {};
        if (title) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (content !== undefined) updateData.content = content.trim();
        if (category) updateData.category = category.trim();
        if (author) updateData.author = author.trim();
        if (authorEmail) updateData.authorEmail = authorEmail.trim();
        if (image) updateData.image = image.trim();
        if (status) updateData.status = status;
        if (featured !== undefined) updateData.featured = Boolean(featured);

        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags)
                ? tags
                : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);
        }

        updateData.updatedAt = new Date();

        const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedBlog) {
            return res.status(404).json({ success: false, message: 'Blog article not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully!',
            data: updatedBlog
        });
    } catch (error) {
        console.error('Error in updateBlog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update blog'
        });
    }
};

/**
 * DELETE /api/blogs/:id
 * Delete blog (Admin only)
 */
exports.deleteBlog = async (req, res) => {
    try {
        const role = (req.user?.role || req.headers['x-user-role'] || req.body?.userRole || '').toLowerCase().trim();
        if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Only administrators can delete blogs.'
            });
        }

        const { id } = req.params;
        const deleted = await Blog.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Blog article not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully.'
        });
    } catch (error) {
        console.error('Error in deleteBlog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete blog'
        });
    }
};

/**
 * POST /api/blogs/ai-generate
 * Generate blog draft, improve content, or suggest titles with Google Gemini AI
 */
exports.generateAIBlog = async (req, res) => {
    try {
        const role = (req.user?.role || req.headers['x-user-role'] || req.body?.userRole || '').toLowerCase().trim();
        if (role !== 'admin' && req.headers['x-user-role'] !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: AI blog writing assistant is restricted to administrators.'
            });
        }

        const {
            topic,
            category = 'Education',
            tone = 'Inspirational and Educational',
            targetAudience = 'Students, Parents, and Teachers',
            action = 'full_article', // 'full_article' | 'polish_draft' | 'suggest_titles'
            existingDraft = '',
            keywords = ''
        } = req.body;

        if (!topic && !existingDraft && action !== 'suggest_titles') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a topic or prompt for AI generation.'
            });
        }

        let prompt = '';

        if (action === 'polish_draft') {
            prompt = `You are a professional educational copywriter and blog editor for EduManage School.
Enhance, structure, and polish the following blog draft. Keep the core message but make it highly engaging, well-formatted, and grammatically flawless.

Topic: ${topic || 'School Education'}
Category: ${category}
Tone: ${tone}
Audience: ${targetAudience}

Current Draft:
"""
${existingDraft}
"""

Return your response ONLY in valid JSON format matching this schema:
{
  "title": "Polished, catchy blog title",
  "description": "Engaging 2-sentence summary/excerpt (under 200 characters)",
  "content": "Full formatted markdown content with headings, paragraphs, and bullet points",
  "category": "${category}",
  "tags": ["3-5 relevant keyword tags"]
}`;
        } else if (action === 'suggest_titles') {
            prompt = `You are an expert school blog content strategist for EduManage.
Generate 5 compelling, modern, and click-worthy educational blog titles based on:
Topic: ${topic}
Category: ${category}

Return your response ONLY in valid JSON format:
{
  "titles": [
    "Title 1",
    "Title 2",
    "Title 3",
    "Title 4",
    "Title 5"
  ],
  "suggestedCategory": "${category}",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;
        } else {
            // Full Article Generation
            prompt = `You are an acclaimed educational author, school principal, and thought leader writing for the EduManage School Management platform blog.
Write a comprehensive, captivating, and high-impact educational blog article.

Topic: ${topic}
Category: ${category}
Tone: ${tone}
Target Audience: ${targetAudience}
${keywords ? `Keywords to include: ${keywords}` : ''}

Guidelines:
1. Provide an inspiring, descriptive title.
2. Provide a 2-sentence captivating description / summary.
3. Write an in-depth article body (around 400 to 700 words) formatted in markdown with clear introductory hook, structured subheadings (## Subheading), well-spaced paragraphs, actionable takeaways, and a warm concluding thought.
4. Include 4-6 relevant tag strings.

Return your response ONLY in valid JSON format (do not include extra text outside the JSON object):
{
  "title": "Title here",
  "description": "Short compelling summary here",
  "content": "Full markdown content with sections and bullet points here",
  "category": "${category}",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"]
}`;
        }

        const rawResponse = await callGemini(prompt);

        // Parse JSON from response (strip any markdown ```json ... ``` codeblocks or outer text)
        let cleaned = rawResponse.trim();
        if (cleaned.includes('```json')) {
            cleaned = cleaned.replace(/^[\s\S]*?```json\s*/i, '').replace(/\s*```[\s\S]*$/, '').trim();
        } else if (cleaned.includes('```')) {
            cleaned = cleaned.replace(/^[\s\S]*?```\s*/, '').replace(/\s*```[\s\S]*$/, '').trim();
        }

        let parsedResult = null;
        try {
            parsedResult = JSON.parse(cleaned);
        } catch (parseErr) {
            // Attempt to extract the first { ... } object from string
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    parsedResult = JSON.parse(match[0]);
                } catch (innerErr) {
                    console.error('Regex JSON extract failed:', innerErr);
                }
            }
            if (!parsedResult) {
                parsedResult = {
                    title: topic || "Educational Article",
                    description: "An insightful educational article from EduManage.",
                    content: rawResponse,
                    category: category || "Education",
                    tags: ["Education", "School", "Learning"]
                };
            }
        }

        res.status(200).json({
            success: true,
            data: parsedResult
        });
    } catch (error) {
        console.error('Error in generateAIBlog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'AI blog generation failed. Please check your Gemini API key.'
        });
    }
};
