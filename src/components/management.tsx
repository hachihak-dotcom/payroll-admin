"use client";

import { ArrowDown, ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight, Inbox, Pencil, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";
import { adminResource, type Resource } from "@/lib/resources";
import { roles, roleLabels } from "@/lib/roles";
import { catalogSchema, userCreateSchema, userUpdateSchema } from "@/lib/validation";
import type { Role } from "@prisma/client";

type RecordRow = {
  id: string; name: string; active: boolean; updatedAt: string;
  code?: string; email?: string; role?: Role; departmentId?: string | null; department?: string;
};
type Department = { id: string; name: string };
type FormValues = { code: string; name: string; email: string; password: string; role: Role; departmentId: string; active: boolean };

export function Management({ resource, rows, departments, editable }: {
  resource: Resource; rows: RecordRow[]; departments: Department[]; editable: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [record, setRecord] = useState<RecordRow>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const isUser = resource === "users";
  const meta = adminResource[resource];

  function open(row?: RecordRow) {
    setNotice("");
    setRecord(row);
    setEditing(true);
    dialog.current?.showModal();
  }

  const columns = useMemo<ColumnDef<RecordRow>[]>(() => [
    ...(isUser ? [
      { accessorKey: "name", header: "이름", cell: ({ row }: { row: { original: RecordRow } }) => <strong>{row.original.name}</strong> },
      { accessorKey: "email", header: "이메일" },
      { id: "role", accessorFn: (row: RecordRow) => row.role ? roleLabels[row.role] : "", header: "권한" },
      { accessorKey: "department", header: "부서", cell: ({ row }: { row: { original: RecordRow } }) => row.original.department ?? "—" },
    ] : [
      { accessorKey: "code", header: "코드", cell: ({ row }: { row: { original: RecordRow } }) => <span className="record-code">{row.original.code}</span> },
      { accessorKey: "name", header: "명칭", cell: ({ row }: { row: { original: RecordRow } }) => <strong>{row.original.name}</strong> },
    ]),
    { accessorKey: "active", header: "상태", enableGlobalFilter: false, cell: ({ row }) =>
      <span className={row.original.active ? "status status-active" : "status"}>{row.original.active ? "활성" : "비활성"}</span> },
    { accessorKey: "updatedAt", header: "수정일", enableGlobalFilter: false },
    ...(editable ? [{ id: "action", header: "관리", enableSorting: false, cell: ({ row }: { row: { original: RecordRow } }) =>
      <Button variant="plain" aria-label={`${row.original.name} 수정`} onClick={() => open(row.original)}><Pencil size={15} /> 수정</Button> }] : []),
  ], [editable, isUser]);
  const filtered = useMemo(() => rows.filter((row) => status === "all" || row.active === (status === "active")), [rows, status]);
  const table = useReactTable({
    data: filtered, columns, state: { globalFilter: query, sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });
  const count = table.getFilteredRowModel().rows.length;
  const page = table.getState().pagination.pageIndex + 1;
  return <>
    <PageHeading title={meta.title} description={meta.description} parent={resource === "budget-accounts" ? undefined : "시스템 설정"}
      action={editable && <Button onClick={() => open()}><Plus size={17} /> {meta.singular} 등록</Button>} />
    {notice && <p className="form-success" role="status">{notice}</p>}
    <section className="panel" aria-label={`${meta.singular} 목록`}>
      <div className="table-toolbar">
        <div><h2>{meta.singular} 목록</h2><p>총 <strong>{count.toLocaleString("ko-KR")}</strong>건</p></div>
        <div className="table-filters">
          <label className="search-field"><Search size={17} /><span className="sr-only">목록 검색</span><input value={query}
            onChange={(event) => setQuery(event.target.value)} placeholder={isUser ? "이름, 이메일 또는 부서" : "코드 또는 명칭"} /></label>
          <label><span className="sr-only">상태 필터</span><select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">전체 상태</option><option value="active">활성</option><option value="inactive">비활성</option>
          </select></label>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => {
            const sorted = header.column.getIsSorted();
            const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowDownUp;
            const label = flexRender(header.column.columnDef.header, header.getContext());
            return <th scope="col" key={header.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}>
              {header.column.getCanSort() ? <button type="button" onClick={header.column.getToggleSortingHandler()}>{label}<SortIcon size={13} /></button> : label}
            </th>;
          })}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) =>
            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
          {!count && <tr><td colSpan={columns.length}><div className="empty-panel">
            <div className="empty-icon"><Inbox size={25} /></div><strong>{rows.length ? "검색 결과가 없습니다" : `등록된 ${meta.singular} 정보가 없습니다`}</strong>
            {rows.length ? <p>검색어 또는 상태 필터를 바꿔보세요.</p> : editable && <Button variant="outline" onClick={() => open()}><Plus size={16} /> {meta.singular} 등록</Button>}
          </div></td></tr>}</tbody>
        </table>
      </div>
      {count > 0 && <div className="table-pagination">
        <span>{page} / {table.getPageCount()} 페이지</span>
        <Button variant="outline" disabled={!table.getCanPreviousPage()} aria-label="이전 페이지" onClick={() => table.previousPage()}><ChevronLeft size={16} /></Button>
        <Button variant="outline" disabled={!table.getCanNextPage()} aria-label="다음 페이지" onClick={() => table.nextPage()}><ChevronRight size={16} /></Button>
      </div>}
    </section>
    <dialog className="editor-dialog" ref={dialog} onClose={() => setEditing(false)} aria-labelledby="editor-title">
      {editing && <Editor record={record} resource={resource} departments={departments} close={() => dialog.current?.close()}
        onSaved={() => { dialog.current?.close(); setNotice(record ? "변경 사항을 저장했습니다." : "등록을 완료했습니다."); }} />}
    </dialog>
  </>;
}

function Editor({ resource, record, departments, close, onSaved }: {
  resource: Resource; record?: RecordRow; departments: Department[]; close: () => void; onSaved: () => void;
}) {
  const router = useRouter();
  const isUser = resource === "users";
  const noun = adminResource[resource].singular;
  const { register, handleSubmit, formState, setError } = useForm<FormValues>({
    defaultValues: { code: record?.code ?? "", name: record?.name ?? "", email: record?.email ?? "",
      password: "", role: record?.role ?? "VIEWER", departmentId: record?.departmentId ?? "", active: record?.active ?? true },
  });
  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    const result = (isUser ? (record ? userUpdateSchema : userCreateSchema) : catalogSchema).safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) setError(issue.path[0] as keyof FormValues, { message: issue.message });
      return;
    }
    try {
      const response = await fetch(`/api/admin/${resource}${record ? "/" + record.id : ""}`, {
        method: record ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // Send the form input so the server can apply the same validation and normalization.
        body: JSON.stringify(raw),
      });
      if (!response.ok) {
        const payload = await response.json();
        setError("root", { message: payload.error || "저장 중 오류가 발생했습니다." });
        return;
      }
      onSaved();
      router.refresh();
    } catch {
      setError("root", { message: "서버에 연결할 수 없습니다. 다시 시도하세요." });
    }
  };
  const { errors, isSubmitting } = formState;
  const fields = isUser ? [
    { key: "name", label: "이름", type: "text", autoComplete: "off" },
    { key: "email", label: "이메일", type: "email", autoComplete: "off" },
    { key: "password", label: record ? "새 비밀번호 (선택)" : "초기 비밀번호", type: "password", autoComplete: "new-password" },
  ] as const : [
    { key: "code", label: "코드", type: "text", autoComplete: "off" },
    { key: "name", label: "명칭", type: "text", autoComplete: "off" },
  ] as const;
  return <>
    <header><h2 id="editor-title">{noun} {record ? "수정" : "등록"}</h2><button type="button" className="icon-button" aria-label="닫기" onClick={close}><X size={20} /></button></header>
    <form className="editor-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      {fields.map(({ key, label, type, autoComplete }) => <label key={key}>{label}
        <input type={type} {...register(key)} autoComplete={autoComplete} aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? `error-${key}` : undefined} />
        {errors[key] && <span className="field-error" id={`error-${key}`}>{errors[key]?.message}</span>}
      </label>)}
      {isUser && <div className="editor-columns">
        <label>역할<select {...register("role")}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
        <label>소속 부서<select {...register("departmentId")} aria-invalid={Boolean(errors.departmentId)} aria-describedby={errors.departmentId ? "department-error" : undefined}>
          <option value="">미지정</option>{record?.departmentId && !departments.some((department) => department.id === record.departmentId) && <option value={record.departmentId}>{record.department} (비활성)</option>}
          {departments.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
        </select>{errors.departmentId && <span id="department-error" className="field-error">{errors.departmentId.message}</span>}</label>
      </div>}
      <label className="check-field"><input type="checkbox" {...register("active")} /> 활성</label>
      {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      <footer><Button variant="outline" onClick={close} disabled={isSubmitting}>취소</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "저장 중…" : "저장"}</Button></footer>
    </form>
  </>;
}
