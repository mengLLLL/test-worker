// worker pool 完全重构
processData(key, data) {
    // 为每次处理创建一个全新的 Subject，彻底隔离数据流
    const taskResultSubject = new Subject();
    
    // 生成唯一的批次ID
    const batchId = `${key}_${Date.now()}`;
    const taskIds = [];
    
    // 分批处理数据
    const batchSize = 100;
    let pendingTasks = 0;
    
    // 清空之前的处理，确保不会累积
    this.clearTasksForKey(key);
    
    // 分批创建任务
    for (let i = 0; i < data.length; i += batchSize) {
        const slice = data.slice(i, i + batchSize);
        const taskId = `${batchId}_${i}`;
        taskIds.push(taskId);
        pendingTasks++;
        
        // 创建并添加任务
        this.addTask({
            id: taskId,
            key: key,
            data: slice
        });
    }
    
    // 创建一个特定于此次处理的订阅
    const subscription = this.resultSubject.subscribe(result => {
        // 严格检查是否属于当前批次
        if (taskIds.includes(result.taskId)) {
            // 发送给当前处理的Subject
            taskResultSubject.next(result);
            
            pendingTasks--;
            
            // 所有任务完成后，结束Subject
            if (pendingTasks <= 0) {
                taskResultSubject.complete();
                // 清理订阅
                subscription.unsubscribe();
            }
        }
    });
    
    // 添加超时保护
    setTimeout(() => {
        if (!taskResultSubject.closed) {
            taskResultSubject.complete();
            subscription.unsubscribe();
        }
    }, 30000);
    
    // 返回仅包含当前批次结果的Observable
    return taskResultSubject.pipe(
        // 聚合结果
        scan((acc, current) => {
            if (!acc.data) {
                return current;
            }
            return {
                key: key,
                data: [...acc.data, ...current.data]
            };
        }, { key, data: [] }),
        // 只取最终结果
        takeLast(1)
    );
}

// 清理指定key的所有任务
clearTasksForKey(key) {
    // 实现清理逻辑
    this.taskQueue = this.taskQueue.filter(task => task.key !== key);
}