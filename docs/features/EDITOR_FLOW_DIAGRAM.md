# AI Image Editor - Visual Flow Diagram

## 📊 Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP NAVIGATION                           │
│  Home | AI Image Editor | Products | Jobs | Templates | ...     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESS BAR (Always Visible)                │
│  ● ──── ○ ──── ○ ──── ○ ──── ○                                 │
│  1      2      3      4      5                                  │
│ Select Choose Config Process Review                             │
│ Image   Tool                & Push                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 1: SELECT IMAGE                       │
│                                                                 │
│  [Product Image 1]  [Product Image 2]  [Product Image 3]       │
│   T-Shirt Blue       Sneakers Red      Jacket Black            │
│                                                                 │
│  [Product Image 4]  [Product Image 5]  [Product Image 6]       │
│   Hat Green          Bag Brown         Sunglasses              │
│                                                                 │
│  ← User clicks an image →                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 2: CHOOSE TOOL                        │
│                                                                 │
│  ┌─── Background & Masking ──────────────────────┐            │
│  │ [Background Removal]              1 credit    │            │
│  │ Precisely remove backgrounds...                │            │
│  └────────────────────────────────────────────────┘            │
│                                                                 │
│  ┌─── Enhancement ────────────────────────────────┐           │
│  │ [Image Enhancement]               1 credit    │            │
│  │ AI-powered quality enhancement...              │            │
│  │                                                 │            │
│  │ [Photo Retouching]                1 credit    │            │
│  │ Remove blemishes and imperfections...          │            │
│  │                                                 │            │
│  │ [AI Upscaling (4x)]               2 credits   │            │
│  │ Upscale to 4x resolution...                    │            │
│  └────────────────────────────────────────────────┘            │
│                                                                 │
│  ┌─── Color Management ───────────────────────────┐           │
│  │ [Color Correction]                1 credit    │            │
│  │ Professional color grading...                  │            │
│  └────────────────────────────────────────────────┘            │
│                                                                 │
│  [← Back]                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                         ┌────────┐
                         │ OpenAI?│
                         └────────┘
                        Yes/      \No
                          │        │
                          ▼        ▼
                    ┌─────────┐  ┌──────────────────────────┐
                    │  SKIP   │  │  STEP 3: CONFIGURE       │
                    │  TO     │  │                          │
                    │  STEP 4 │  │  Strength:    [===|====] │
                    └─────────┘  │               0.8        │
                                 │                          │
                                 │  Face Enhance: [✓] On    │
                                 │                          │
                                 │  [← Back]  [Continue →]  │
                                 └──────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 4: PROCESSING                           │
│                                                                 │
│                        ⟳                                        │
│                    (Spinner)                                    │
│                                                                 │
│              Processing Your Image                              │
│           AI is working on your image...                        │
│                                                                 │
│         ████████████████████░░░░░░                             │
│                   75% complete                                  │
│                                                                 │
│         Status: Processing... (polling every 2s)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 5: REVIEW & PUSH                         │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌──────────────┬──────────────┐                       │   │
│  │  │   ORIGINAL   │  AI PROCESSED│                       │   │
│  │  ├──────────────┴──────────────┤                       │   │
│  │  │                              │  ← Draggable Slider   │   │
│  │  │         [Image Split]        │                       │   │
│  │  │                              │                       │   │
│  │  └──────────────────────────────┘                       │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Upload to Shopify]  [Download]  [Process Another Image]      │
│                                                                 │
│  ← Click "Upload to Shopify" →                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SHOPIFY PRODUCT IMAGE UPLOAD                       │
│                                                                 │
│  GraphQL Mutation: productAppendImages                          │
│                                                                 │
│  ✓ Image uploaded successfully!                                │
│  Toast notification appears                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 State Flow Diagram

```
Initial State:
└─> currentStep = 0
    selectedImage = null
    selectedModel = null
    parameters = {}
    jobId = null

User Selects Image:
└─> selectedImage = "image_url"
    selectedProduct = product_object
    currentStep = 1

User Selects AI Tool:
└─> selectedModel = model_object
    parameters = model.default_parameters
    currentStep = 2 (or 3 if OpenAI)

User Configures Parameters (if not OpenAI):
└─> parameters = { ...updated_params }
    currentStep = 3

User Submits Job:
└─> fetcher.submit({ actionType: "submitJob", ... })
    jobId = response.job.id
    jobStatus = "processing"
    currentStep = 3

Polling Job Status:
└─> Every 2 seconds:
    └─> getJobStatus(jobId)
        └─> If completed:
            └─> resultUrl = job.result_url
                currentStep = 4

User Pushes to Shopify:
└─> fetcher.submit({ actionType: "pushToShopify", ... })
    └─> Success:
        └─> Toast: "Image uploaded!"
            Can download or process another

User Downloads:
└─> Create <a> element
    Set href = resultUrl
    Trigger download

User Processes Another:
└─> Reset all state to initial
    currentStep = 0
```

---

## 🎨 Component Hierarchy

```
EditorPage
├── ProgressBar
│   ├── Step Circles (1-5)
│   ├── Connecting Lines
│   └── Progress Percentage Bar
│
├── Step 1: ImageSelectionStep
│   └── ProductImage Grid
│       ├── Image Card 1
│       ├── Image Card 2
│       └── Image Card N
│
├── Step 2: ToolSelectionStep
│   └── Grouped AI Models
│       ├── Category 1
│       │   ├── Model Card 1
│       │   └── Model Card 2
│       ├── Category 2
│       │   └── Model Card 3
│       └── Back Button
│
├── Step 3: ParametersStep
│   ├── Parameter Inputs
│   │   ├── Slider (for numbers)
│   │   ├── Checkbox (for booleans)
│   │   └── Text Input (for strings)
│   ├── Back Button
│   └── Continue Button
│
├── Step 4: ProcessingStep
│   ├── Loading Spinner
│   ├── Status Message
│   ├── Progress Bar
│   └── Progress Percentage
│
└── Step 5: ReviewPushStep
    ├── ImageComparisonSlider
    │   ├── Original Image (clipped)
    │   ├── Processed Image (full)
    │   └── Draggable Divider
    ├── Upload Button
    ├── Download Button
    └── Process Another Button
```

---

## 📡 API Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. Load Editor
     ├─────────────────────────────────────────┐
     │                                          │
     │  loader() function                       │
     │  ┌─────────────────────────────────┐   │
     │  │ Fetch Shopify Products (GraphQL)│   │
     │  │ GET /graphql                     │   │
     │  │   query getProducts { ... }      │   │
     │  └─────────────────────────────────┘   │
     │                                          │
     │  ┌─────────────────────────────────┐   │
     │  │ Fetch AI Models                  │   │
     │  │ GET /api/ai-models               │   │
     │  │ (Currently using mock data)      │   │
     │  └─────────────────────────────────┘   │
     │                                          │
     │◄─────────────────────────────────────────┘
     │
     │ 2. Submit Job
     ├─────────────────────────────────────────┐
     │                                          │
     │  action({ actionType: "submitJob" })     │
     │  ┌─────────────────────────────────┐   │
     │  │ POST /api/jobs                   │   │
     │  │ {                                │   │
     │  │   model_id,                      │   │
     │  │   image_url,                     │   │
     │  │   parameters                     │   │
     │  │ }                                │   │
     │  └─────────────────────────────────┘   │
     │                                          │
     │◄─────────────────────────────────────────┘
     │  Response: { job: { id, status } }
     │
     │ 3. Poll Job Status (every 2s)
     ├─────────────────────────────────────────┐
     │                                          │
     │  useEffect polling loop                  │
     │  ┌─────────────────────────────────┐   │
     │  │ GET /api/jobs/:id                │   │
     │  │ (Currently simulated)            │   │
     │  └─────────────────────────────────┘   │
     │                                          │
     │◄─────────────────────────────────────────┘
     │  Response: { job: { id, status, result_url } }
     │
     │ 4. Upload to Shopify
     ├─────────────────────────────────────────┐
     │                                          │
     │  action({ actionType: "pushToShopify" }) │
     │  ┌─────────────────────────────────┐   │
     │  │ POST /graphql                    │   │
     │  │ mutation productAppendImages {   │   │
     │  │   productId: "...",              │   │
     │  │   images: [{ src, altText }]     │   │
     │  │ }                                │   │
     │  └─────────────────────────────────┘   │
     │                                          │
     │◄─────────────────────────────────────────┘
     │  Response: { newImages: [...] }
     │
     │ 5. Show Success
     └─> Toast notification
         "Image uploaded to Shopify!"
```

---

## 🎯 Parameter Configuration Logic

```
Parameter Type Detection:
├── typeof value === "number"
│   └─> Render: <input type="range" />
│       ├── Display: Current value badge
│       ├── Min/Max: Based on parameter name
│       └── Step: 0.1 (or 1 for scale)
│
├── typeof value === "boolean"
│   └─> Render: <input type="checkbox" />
│       ├── Display: Enabled/Disabled label
│       └── Toggle: onChange handler
│
└── typeof value === "string"
    └─> Render: <input type="text" />
        ├── Display: Text field
        └── Update: onChange handler

Special Cases:
├── OpenAI Provider
│   └─> Skip parameter step entirely
│       Auto-advance to processing
│
└── No Parameters
    └─> Show "Ready to Process" message
        Use optimized defaults
```

---

## 🔄 Job Status Polling

```
Job Submission:
└─> jobId = "job_123"
    jobStatus = "processing"
    currentStep = 3

Polling Loop Starts:
└─> useEffect([jobId, jobStatus])
    │
    └─> if (jobStatus === "processing")
        │
        └─> setInterval(async () => {
            │
            ├─> const job = await getJobStatus(jobId)
            │
            ├─> setJobStatus(job.status)
            │   setJobProgress(job.progress)
            │
            └─> if (job.status === "completed")
                ├─> setResultUrl(job.result_url)
                ├─> setCurrentStep(4)
                └─> clearInterval()
            }, 2000)

Mock Simulation:
└─> Increments progress by 10% every 500ms
    └─> At 90%:
        └─> setTimeout(() => {
            ├─> setJobStatus("completed")
            ├─> setResultUrl("https://picsum.photos/...")
            └─> setCurrentStep(4)
            }, 1000)
```

---

## 🎨 UI Component Breakdown

### ProgressBar Component
```
Props:
├─ steps: Step[]
└─ currentStep: number

Renders:
├─ For each step:
│  ├─ Circle with number/checkmark
│  ├─ Step label
│  ├─ Optional description
│  └─ Connecting line (if not last)
│
└─ Progress percentage bar
   └─ Width: (currentStep + 1) / steps.length * 100%
```

### ImageComparisonSlider Component
```
Props:
├─ beforeImage: string
├─ afterImage: string
├─ beforeLabel: string
└─ afterLabel: string

State:
├─ sliderPosition: number (0-100)
└─ isDragging: boolean

Renders:
├─ After Image (full width)
├─ Before Image (clipped to sliderPosition)
└─ Draggable Divider
   ├─ Vertical line
   └─ Circular handle with ⟷

Events:
├─ onMouseDown → setIsDragging(true)
├─ onMouseMove → update sliderPosition
└─ onMouseUp → setIsDragging(false)
```

---

## 📊 Data Flow

```
Loader Data:
products ──┐
          ├──> useLoaderData()
aiModels ──┘     │
                 ├──> Component State
                 └──> Render UI

User Actions:
Click Image ──> setSelectedImage() ──> Next Step
Select Tool ──> setSelectedModel() ──> Next Step
Change Param ──> setParameters() ──> Update UI
Submit Job ──> fetcher.submit() ──> Server Action
                                  └──> Response
                                      └──> Update State

Server Actions:
submitJob ──> Create Job ──> Return { job }
pushToShopify ──> Upload Image ──> Return { newImages }

Polling:
useEffect ──> setInterval ──> getJobStatus()
                          └──> Update Progress
                              └──> If Complete
                                  └──> Show Results
```

---

## 🎯 Key Integration Points

1. **Shopify Products** → GraphQL query in loader
2. **AI Models** → Mock data (replace with API call)
3. **Job Processing** → Backend API (currently simulated)
4. **Image Upload** → Shopify GraphQL mutation
5. **Status Polling** → Real-time updates (mocked)

---

This visual guide shows the complete flow from start to finish! 🚀
