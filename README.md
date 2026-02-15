# 📰 npmx-weekly

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)
[![Netlify Status](https://api.netlify.com/api/v1/badges/afbfb0ad-fbdc-4839-991d-237cd0fc6418/deploy-status)](https://app.netlify.com/projects/npmx-weekly/deploys)

A weekly newsletter for the [**npmx**](https://repo.npmx.dev) ecosystem.

---

## 🚀 Contribute to the Next Post

We welcome the community to share their projects, work, and updates regarding **npmx**! 

Every week, an automated draft PR is opened for the upcoming post. You can suggest your own sections or updates by contributing directly to that PR during our open window:

* **Window Opens:** Friday @ 18:00 UTC (Post & Email generated)
* **Window Closes:** Sunday @ 22:30 UTC (Automerge & Email broadcast)

> [!NOTE]
> These times are approximate. GitHub Action schedules can occasionally be delayed by up to an hour depending on system load.
> 
> Also, please note that any content published elsewhere on Saturday or Sunday is **not** automatically included in the draft, as the base post is generated on Friday. If you have weekend updates, feel free to add them to the PR manually!

### How to add your content:

1.  Check for the active **Weekly Post** or **Weekly Email** draft here: [**Open Pull Requests**](https://github.com/trueberryless-org/npmx-weekly/pulls?q=is%3Aopen+is%3Apr+label%3A%22%F0%9F%95%94+weekly+email%22%2C%22%F0%9F%95%94+weekly+post%22)
2.  Suggest your changes or add a new section to that PR.
3.  Ping **@trueberryless** in your PR comments so your contribution is reviewed before the Sunday deadline!

---

## 📧 Email Newsletter

In addition to the blog post, we send a condensed weekly digest via email.
* **Reviewing:** The email content is stored as JSON in `src/content/emails/`. 
* **Broadcast:** Once the automated PR is merged on Sunday, the newsletter is automatically broadcasted to all subscribers via [Resend](https://resend.com).
