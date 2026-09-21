# Moxt 登录注册视觉参考

2026-09-08。用户明确要求参考 Moxt，替代上一版单栏登录页。

实际查看 [Moxt 注册](https://moxt.ai/signup) 与 [Moxt 登录](https://moxt.ai/login)：桌面左右双栏，左边是白底协作插画与简短说明，右边浅灰底，品牌标识位于白色卡片上方；表单约 420px 宽，输入框与按钮为胶囊圆角，绿色主按钮。登录注册的 Google 入口未在 TaskDoor 中复制，因为项目没有对应鉴权能力。

本次落地：左右各半；原创人物与 AI 同伴围绕门的插画；右侧品牌、居中标题、圆角输入框和绿按钮。保留 TaskDoor 标识与中文文案。820px 以下隐藏插画栏，保留表单；隐藏的字段标签仍关联输入，验证码和团队操作保留可见标签。既有登录、注册、重置密码、创建和加入团队状态逻辑没有修改。

按用户进一步要求优化小圆点的流动质感：人物、插画与文案保持静止，SVG 描摹原图的六条向内连接线，以 CSS motion path 驱动真实圆形粒子。每条线一大一小两个圆点，间隔 0.34 秒，使用与角色呼应的薄荷绿、淡紫和暖黄色，加细白边与淡淡的外晕。周期 6.4 秒，六组错开起点；圆点沿弧线柔和加速、收缓，到门内缩小消隐，同步触发门内柔光和椭圆涟漪。门扇与门框遮罩保留遮挡关系；没有恢复线段尾迹或整图浮动。动画仅在桌面且系统未要求减少动态效果时启用，无逐帧 React 更新、无新增依赖。本次前端类型检查通过；桌面浏览器确认 12 个粒子的路径位置变化、门内到达反馈、插画静止且无横向溢出。

插画使用内置 image_gen 工具生成；项目资源为 [onboarding-team-v1.png](../../public/images/onboarding-team-v1.png)。没有复制 Moxt 的图片或源码。

生成提示词：

```text
Use case: illustration-story. Create a polished original editorial vector-style illustration for the left half of TaskDoor, a team-work SaaS login page inspired by the light, friendly illustration-led feel of Moxt. Square 1024x1024 canvas, pure white #ffffff background. A sparse airy constellation of exactly 6 distinct friendly teammates: three beautifully drawn black-and-white human head portraits (a woman with a short bob, a person with wavy hair, a person wearing round glasses) and three playful abstract AI companions (one mint green rounded four-point star with a small smiling face, one golden yellow soft pebble character, one lilac rounded geometric character). Small crisp hand-drawn black features, confident clean silhouettes. Arrange them at varied positions around a small central mint-green open doorway as the shared collaboration symbol; connect with very fine light sage dotted curved lines, spacious balanced circular composition. Characters are visually independent with ample white space, varying sizes 85-145px, entire art occupies 80 percent of canvas. Flat opaque fills, no black outer border on colored characters, human portraits fine editorial ink line art with solid black hair. Warm, intelligent, restrained, charming, premium SaaS editorial art. No words, no letters, no logos, no numbers, no UI, no mockup, no device, no shadows, no gradients, no 3D, no paper texture, no background frame, no noisy embellishments. This is an original illustration, do not reproduce a specific company's characters.
```

验证：浏览器实看桌面 1440px、手机 390px 以及最窄 320px；已完成注册→错误验证码→正确验证→团队选择，检查密码显隐、登录／注册／忘记密码链接和窄屏溢出。构建通过。正式鉴权和邮件发送仍未接入，本次只更新视觉。
