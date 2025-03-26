# RxJS + Angular + Web Worker 数据仪表盘架构

```mermaid
graph TD
    %% 主要组件定义
    subgraph 主程序
        A[主界面初始化] --> B[组件和服务注入]
        B --> C[系统启动与停止]
    end
    
    subgraph 数据服务层
        D[DataService] --> D1[初始数据生成]
        D --> D2[增量数据更新]
        D --> D3[外部数据导入]
        D --> D4[数据缓存策略]
    end
    
    subgraph Worker线程池
        E[WorkerPool] --> E1[Worker线程管理]
        E --> E2[任务队列与调度]
        E --> E3[批量数据处理]
        E --> E4[结果收集与合并]
    end
    
    subgraph Worker内部处理
        F[Worker处理流程] --> F1[数据统计计算]
        F --> F2[数据规范化]
        F --> F3[错误处理]
        F --> F4[结果返回]
    end
    
    subgraph 可视化层
        G[VisualizationService] --> G1[SVG图表初始化]
        G --> G2[数据绑定与更新]
        G --> G3[动画与过渡效果]
        G --> G4[坐标变换与缩放]
    end
    
    subgraph 组件交互
        H[DashboardComponent] --> H1[事件监听]
        H --> H2[数据订阅]
        H --> H3[UI更新]
        H --> H4[资源管理]
    end
    
    %% 数据流向
    C -->|系统启动| D1
    D1 -->|初始数据| E2
    D2 -->|增量数据| E2
    D3 -->|导入数据| E2
    
    E2 -->|任务分配| E3
    E3 -->|批次处理| F
    F4 -->|处理结果| E4
    E4 -->|数据流| D
    
    D -->|Observable数据流| H2
    H2 -->|渲染数据| G2
    G2 -->|更新图表| G3
    
    %% 使用RxJS的流程
    subgraph RxJS异步流
        RX1[Observable创建] --> RX2[数据管道处理]
        RX2 --> RX3[流订阅与响应]
        RX3 --> RX4[资源清理]
    end
    
    D -->|创建数据流| RX1
    E -->|结果通知| RX2
    H2 -->|订阅数据| RX3
    H4 -->|销毁订阅| RX4
    
    %% 主要函数关联
    classDef mainFunction fill:#f9f,stroke:#333,stroke-width:2px;
    class D1,E1,F1,G1,H1 mainFunction;
```

## 增量数据处理流程

```mermaid
sequenceDiagram
    participant C as DashboardComponent
    participant D as DataService
    participant W as WorkerPool
    participant P as Worker线程
    participant V as VisualizationService
    
    Note over C,V: 初始化阶段
    C->>D: initData(dataType, 200)
    D->>D: 生成初始数据集
    D->>W: processData(dataType, initialData)
    W->>W: 数据分批(25个/批次)
    loop 批次处理
        W->>P: 发送批次任务
        P->>P: 处理数据批次
        P-->>W: 返回处理结果
        W-->>D: 通过Subject发送结果
    end
    
    D->>D: 通过scan操作符合并批次结果
    D->>D: 存储到processedDataStore
    D->>D: 发送完整结果到processedData$ Subject
    
    Note over C,V: 增量更新阶段
    loop 每500ms
        C->>D: generateNewData(dataType, 8-15)
        D->>D: 生成新增量数据
        D->>D: 存储到dataStore
        
        D->>W: processData(dataType, newData)
        W->>W: 增量数据分批
        W->>P: 发送增量批次任务
        P->>P: 处理增量数据
        P-->>W: 返回增量处理结果
        W-->>D: 通过Subject发送结果
        
        D->>D: 合并增量结果到现有数据
        D->>D: 应用缓存策略(保留最新3000个点)
        D->>D: 发送更新后的完整数据集
        
        D-->>C: 通过Observable通知数据更新
        C->>V: updateChart(dataType, data)
        V->>V: 平滑更新图表(带动画过渡)
    end
```

## 数据存储与合并机制

```mermaid
graph TD
    subgraph 原始数据管理
        R1[dataStore对象] --> R2["dataA数组(最新1000个点)"]
        R1 --> R3["dataB数组(最新1000个点)"]
        R4[dataChangeSubjects] --> R5["dataA: ReplaySubject(1)"]
        R4 --> R6["dataB: ReplaySubject(1)"]
    end
    
    subgraph 数据处理与转换
        P1[WorkerPool处理] --> P2[数据规范化]
        P2 --> P3[统计计算]
        P3 --> P4[派生值计算]
    end
    
    subgraph 处理结果存储
        S1[processedDataStore对象] --> S2["dataA数组(最新3000个点)"]
        S1 --> S3["dataB数组(最新3000个点)"]
        S4[processedData$] --> S5["dataA: BehaviorSubject"]
        S4 --> S6["dataB: BehaviorSubject"]
    end
    
    subgraph 统计信息管理
        T1[statsSubjects对象] --> T2["dataA: BehaviorSubject"]
        T1 --> T3["dataB: BehaviorSubject"]
        T4[allStats$] --> T5["combineLatest操作符"]
        T2 --> T5
        T3 --> T5
    end
    
    %% 增量数据流
    R4 -.->|增量通知| P1
    P1 -.->|结果合并| S1
    S1 -.->|更新| S4
    P3 -.->|统计更新| T1
    
    %% 说明增量合并
    S1 -->|scan操作符合并| S7["增量合并策略"]
    S7 -->|1. 添加新处理数据| S8["合并到已有数据集"]
    S8 -->|2. 应用缓存策略| S9["保留最新点"]
    S9 -->|3. 触发UI更新| S4
    
    classDef store fill:#eff,stroke:#099;
    classDef subject fill:#fee,stroke:#e33;
    
    class R1,R4,S1,S4,T1,T4 subject;
    class R2,R3,S2,S3,T2,T3 store;
```

## 关键组件详解

### 数据服务层 (DataService)
- **初始数据生成**：`initData(dataType, count)` - 生成初始数据集
- **增量数据更新**：`generateNewData(dataType, count)` - 定期生成新数据点
- **数据处理委托**：`processDataWithWorker(dataType, data)` - 使用Worker处理数据
- **数据流管理**：使用RxJS的Subject和BehaviorSubject管理多个数据流
- **缓存策略**：维护数据窗口大小，避免过多数据影响性能

### Worker线程池 (WorkerPool)
- **线程管理**：`initWorkers()` - 初始化和管理多个Worker线程
- **任务队列**：维护任务队列，按FIFO原则分配任务
- **任务调度**：`processNextTask()` - 高效分配任务到空闲Worker
- **批量处理**：将大数据集分割成小批次并行处理
- **结果收集**：`handleWorkerMessage()` - 收集并合并处理结果

### 可视化服务 (VisualizationService)
- **图表初始化**：`initChart(dataType, svgId)` - 创建SVG图表元素
- **动态更新**：`updateChart(dataType, data)` - 平滑更新图表数据
- **过渡动画**：使用CSS过渡效果实现平滑图表更新
- **自适应布局**：响应窗口大小变化，调整图表尺寸

### 仪表盘组件 (DashboardComponent)
- **生命周期管理**：`init()`和`destroy()` - 组件初始化和销毁
- **系统控制**：`startSystem()`和`stopSystem()` - 控制数据流处理
- **UI更新**：使用RxJS订阅数据变化，实时更新界面
- **资源管理**：正确管理订阅和定时器，防止内存泄漏

## RxJS异步数据流处理

整个系统广泛使用RxJS来管理异步数据流：
1. **数据源**：使用Subject和BehaviorSubject作为数据源
2. **数据转换**：使用map、filter、scan等操作符处理数据
3. **流合并**：使用merge、concat、combineLatest组合多个数据流
4. **错误处理**：使用retry和catchError处理异常
5. **资源管理**：使用takeUntil在组件销毁时取消所有订阅

## 核心改进点

1. **提高更新频率**：将更新间隔从2000ms降低到500ms，提供更实时的数据显示
2. **减小批处理大小**：从每批50个点减小到25个点，提高任务分配效率
3. **添加动画过渡**：使用CSS动画和贝塞尔曲线，使图表更新更加平滑
4. **优化Worker处理**：改进Worker内部处理逻辑，使用更高效的算法
5. **增加初始数据量**：从100个点增加到200个点，提供更丰富的起始图表显示 