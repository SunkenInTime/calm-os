 <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <aside className="flex min-h-0 w-72 shrink-0 flex-col border-r border-neutral-800/90 bg-neutral-900/45 px-6 py-8">
        <h2 className="text-base font-medium text-neutral-300">Ideas</h2>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-lg border border-neutral-800 p-3">
          {ideas.length === 0 ? (
            <p className="p-2 text-sm text-neutral-500">No ideas yet.</p>
          ) : (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <article key={idea._id} className="rounded-md bg-neutral-800/70 px-3 py-2">
                  <p className="text-sm text-neutral-200">{idea.title}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-8 py-7">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">Calm OS</h1>
          <button
            type="button"
            onClick={openComposer}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700/90"
          >
            + Task
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 overflow-hidden pb-1">
          <TaskPanel
            columnKey="today"
            title="Today"
            tasks={taskBuckets.todayTasks}
            tone="primary"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'today'}
            className="col-span-8 row-span-3"
          />
          <TaskPanel
            columnKey="tomorrow"
            title="Tomorrow"
            tasks={taskBuckets.tomorrowTasks}
            tone="secondary"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'tomorrow'}
            compact
            className="col-span-4 row-span-1"
          />
          <TaskPanel
            columnKey="dayAfter"
            title="Day After"
            tasks={taskBuckets.dayAfterTasks}
            tone="secondary"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'dayAfter'}
            compact
            className="col-span-4 row-span-1"
          />
          <TaskPanel
            columnKey="unscheduled"
            title="Unscheduled"
            tasks={taskBuckets.unscheduledTasks}
            tone="muted"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'unscheduled'}
            compact
            className="col-span-4 row-span-1"
          />
        </div>
      </main>

      {isComposerOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-neutral-950/70 p-4"
          onClick={closeComposer}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium text-neutral-200">Add Task</h2>
              <button
                type="button"
                onClick={closeComposer}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700/90"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
            {submitError && <p className="mt-2 text-sm text-neutral-400">{submitError}</p>}
          </form>
        </div>
      )}
    </div>