import sys, io, json, types, ast, warnings
from collections import deque

SCHEMA_VERSION = 1


class StepLimit(BaseException):
    pass


# ---------------------------------------------------------------
# Legacy snapshot: still used by the existing lesson scenes
# ---------------------------------------------------------------

def short(x):
    r = repr(x)
    return r if len(r) <= 20 else r[:17] + "..."


def is_user_object(v):
    return (
        hasattr(v, "__dict__")
        and not isinstance(v, (types.FunctionType, type, types.ModuleType))
        and type(v).__module__ == "__main__"
    )


def describe(v):
    t = type(v).__name__

    if isinstance(v, types.FunctionType):
        return {"type": t, "repr": "function"}

    if isinstance(v, type):
        return {
            "type": "class",
            "repr": "class",
            "kind": "class",
            "bases": [b.__name__ for b in v.__bases__ if b is not object],
            "methods": [
                k for k, x in vars(v).items() if isinstance(x, types.FunctionType)
            ],
        }

    if isinstance(v, types.ModuleType):
        return {"type": t, "repr": "module"}

    if is_user_object(v):
        attrs = [[k, short(x)] for k, x in list(vars(v).items())[:12]]
        r = t + "(" + ", ".join(k + "=" + x for k, x in attrs) + ")"
        return {
            "type": t,
            "repr": r,
            "kind": "obj",
            "cls": t,
            "attrs": attrs,
            "mro": [c.__name__ for c in type(v).__mro__ if c is not object],
        }

    r = repr(v)
    if len(r) > 60:
        r = r[:57] + "..."
    d = {"type": t, "repr": r}
    if isinstance(v, (list, tuple)):
        d["kind"] = "seq"
        d["items"] = [short(x) for x in v[:20]]
    elif isinstance(v, dict):
        d["kind"] = "dict"
        d["pairs"] = [[short(k), short(x)] for k, x in list(v.items())[:20]]
    return d


def snapshot(namespace):
    return {
        name: describe(value)
        for name, value in list(namespace.items())
        if not name.startswith("__")
    }


# ---------------------------------------------------------------
# Object identity and value encoding (used by the event system)
# ---------------------------------------------------------------

class Registry:
    """Gives every object a stable id such as Dog#1 or list#2."""

    def __init__(self):
        self.ids = {}
        self.keep = []  # strong references, so ids are never reused
        self.counters = {}
        self.order = {}  # label -> creation number

    def label(self, obj, prefix):
        k = id(obj)
        if k not in self.ids:
            self.counters[prefix] = self.counters.get(prefix, 0) + 1
            name = prefix + "#" + str(self.counters[prefix])
            self.ids[k] = name
            self.order[name] = len(self.order)
            self.keep.append(obj)
        return self.ids[k]


def enc(v, reg):
    """Small JSON-safe description of a value. Containers and objects are
    sent by id only, their contents travel in separate events."""
    if v is None or isinstance(v, (bool, int, float)):
        return {"t": type(v).__name__, "v": repr(v)}
    if isinstance(v, str):
        r = repr(v)
        return {"t": "str", "v": r if len(r) <= 40 else r[:37] + "..."}
    if isinstance(v, types.FunctionType):
        return {"t": "function", "v": v.__name__}
    if isinstance(v, type):
        return {"t": "class", "v": v.__name__}
    if isinstance(v, types.ModuleType):
        return {"t": "module", "v": v.__name__}
    if is_user_object(v):
        return {
            "t": "obj",
            "id": reg.label(v, type(v).__name__),
            "cls": type(v).__name__,
        }
    if isinstance(v, list):
        return {"t": "list", "id": reg.label(v, "list")}
    if isinstance(v, tuple):
        return {"t": "tuple", "id": reg.label(v, "tuple")}
    if isinstance(v, (set, frozenset)):
        return {"t": "set", "id": reg.label(v, "set")}
    if isinstance(v, dict):
        return {"t": "dict", "id": reg.label(v, "dict")}
    r = repr(v)
    return {"t": type(v).__name__, "v": r if len(r) <= 40 else r[:37] + "..."}


def scan(namespaces, reg, limit=300):
    """Walk everything reachable from the given namespaces and describe
    every user object and container once."""
    heap = {}
    seen = set()
    queue = deque()
    for ns in namespaces:
        for name, v in ns.items():
            if not name.startswith("__"):
                queue.append((v, 0))
    for v in list(reg.keep):
        queue.append((v, 0))

    while queue and len(heap) < limit:
        v, depth = queue.popleft()
        if is_user_object(v):
            kind = "obj"
        elif isinstance(v, list):
            kind = "list"
        elif isinstance(v, tuple):
            kind = "tuple"
        elif isinstance(v, (set, frozenset)):
            kind = "set"
        elif isinstance(v, dict):
            kind = "dict"
        else:
            continue
        if id(v) in seen:
            continue
        seen.add(id(v))

        if kind == "obj":
            label = reg.label(v, type(v).__name__)
            items = list(vars(v).items())[:12]
            heap[label] = {
                "kind": "obj",
                "cls": type(v).__name__,
                "attrs": {a: enc(x, reg) for a, x in items},
            }
            children = [x for _, x in items]
        elif kind == "dict":
            label = reg.label(v, "dict")
            items = list(v.items())[:30]
            heap[label] = {
                "kind": "dict",
                "pairs": [[enc(k, reg), enc(x, reg)] for k, x in items],
            }
            children = [x for _, x in items]
        else:
            label = reg.label(v, kind)
            seq = sorted(v, key=repr)[:30] if kind == "set" else list(v)[:30]
            heap[label] = {"kind": kind, "items": [enc(x, reg) for x in seq]}
            children = seq

        if depth < 4:
            for c in children:
                queue.append((c, depth + 1))
    return heap


def clip(text, limit=2000):
    return text if len(text) <= limit else "..." + text[-limit:]


def range_total(node):
    """Length of range(...) when every argument is a plain integer."""
    if (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "range"
        and 1 <= len(node.args) <= 3
        and all(
            isinstance(a, ast.Constant) and isinstance(a.value, int)
            for a in node.args
        )
    ):
        try:
            return len(range(*[a.value for a in node.args]))
        except ValueError:
            return None
    return None


# ---------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------

def run_trace(user_code, max_steps=2000):
    frames = []
    g = {"__name__": "__main__"}
    busy = False
    reg = Registry()

    try:
        tree = ast.parse(user_code)
        code_obj = compile(user_code, "<user>", "exec")
    except SyntaxError as e:
        return json.dumps(
            {
                "schemaVersion": SCHEMA_VERSION,
                "frames": [],
                "error": "SyntaxError: " + str(e.msg) + " (line " + str(e.lineno) + ")",
            }
        )

    # What the source code looks like, found without running anything.
    loop_headers = {}
    class_lines = {}
    if_headers = {}
    handlers = []
    elif_ids = set()
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.If)
            and len(node.orelse) == 1
            and isinstance(node.orelse[0], ast.If)
            and node.orelse[0].col_offset == node.col_offset
        ):
            elif_ids.add(id(node.orelse[0]))
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and node.body[0].lineno > node.lineno:
            if_headers[node.lineno] = {
                "test": ast.unparse(node.test),
                "kind": "elif" if id(node) in elif_ids else "if",
                "body": (node.body[0].lineno, node.body[-1].end_lineno),
                "orelse": (node.orelse[0].lineno, node.orelse[-1].end_lineno) if node.orelse else None,
                "elif_next": len(node.orelse) == 1 and id(node.orelse[0]) in elif_ids,
            }
        elif isinstance(node, ast.ExceptHandler):
            handlers.append({
                "line": node.lineno,
                "end": node.end_lineno,
                "type": ast.unparse(node.type) if node.type else "any error",
            })
        if isinstance(node, ast.For):
            loop_headers[node.lineno] = {
                "kind": "for",
                "end": node.end_lineno,
                "target": node.target.id if isinstance(node.target, ast.Name) else None,
                "source": ast.unparse(node.iter),
                "source_name": node.iter.id if isinstance(node.iter, ast.Name) else None,
                "range_total": range_total(node.iter),
            }
        elif isinstance(node, ast.While):
            loop_headers[node.lineno] = {
                "kind": "while",
                "end": node.end_lineno,
                "target": None,
                "source": ast.unparse(node.test),
                "source_name": None,
                "range_total": None,
            }
        elif isinstance(node, ast.ClassDef):
            class_lines[node.lineno] = node.name

    st = types.SimpleNamespace(
        prev_vars={},
        prev_cb={},
        prev_heap={},
        known=set(),
        prev_out="",
        prev_line=None,
        prev_self=None,
        loops={},
        returns={},
        meta={},
        funcs=set(),
        classes=set(),
        module_fid=None,
        counter=0,
        exc_seen=set(),
        pending_exc=[],
        fid_map={},
        fid_counter=0,
        cb_final={},
        cb_names={},
        pending_if={},
        active_exc=None,
        fid_line={},
        writes=[],
    )

    class Out(io.StringIO):
        """Remembers which user line (and which object) printed each chunk."""

        def write(self, text):
            f = sys._getframe(1)
            while f is not None and f.f_code.co_filename != "<user>":
                f = f.f_back
            if f is not None and text:
                so = self_obj(f)
                owner = reg.label(so, type(so).__name__) if so is not None else None
                st.writes.append({"line": f.f_lineno, "owner": owner, "fid": st.fid_map.get(id(f))})
            return super().write(text)

    out = Out()

    def ev(bucket, type_, line, **payload):
        st.counter += 1
        bucket.append(
            {
                "schemaVersion": SCHEMA_VERSION,
                "eventId": "e" + str(st.counter),
                "type": type_,
                "line": line,
                "payload": payload,
            }
        )

    def is_class_body(f):
        return class_lines.get(f.f_code.co_firstlineno) == f.f_code.co_name

    def self_obj(f):
        code = f.f_code
        if code.co_argcount > 0 and code.co_varnames[0] == "self":
            v = f.f_locals.get("self")
            if is_user_object(v):
                return v
        return None

    def defined_in(obj, code):
        for c in type(obj).__mro__:
            fn = c.__dict__.get(code.co_name)
            if isinstance(fn, types.FunctionType) and fn.__code__ is code:
                return c.__name__
        return type(obj).__name__

    def collect(frame):
        chain = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == "<user>":
                chain.append(f)
            f = f.f_back
        chain.reverse()
        return chain

    def diff_list(bucket, label, line, old, new):
        n_old, n_new = len(old), len(new)
        if n_new >= n_old and new[:n_old] == old:
            for i in range(n_old, n_new):
                ev(bucket, "item_added", line, listId=label, index=i, value=new[i])
        elif n_new == n_old:
            for i in range(n_new):
                if old[i] != new[i]:
                    ev(bucket, "item_updated", line, listId=label, index=i,
                       old=old[i], value=new[i])
        elif n_new < n_old and new == old[:n_new]:
            for i in range(n_old - 1, n_new - 1, -1):
                ev(bucket, "item_removed", line, listId=label, index=i, value=old[i])
        else:
            ev(bucket, "list_changed", line, listId=label, items=new)

    def key_of(e):
        return json.dumps(e, sort_keys=True)

    def compute(levels, line_done, final, error):
        real = [lv for lv in levels if not lv["cb"]]
        cbs = [lv for lv in levels if lv["cb"]]

        # nearest frame we already knew about: its last known line is where
        # events that appear "between" two recorded lines really happened
        base = line_done
        for lv in reversed(real):
            if lv["fid"] in st.fid_line:
                base = st.fid_line[lv["fid"]]
                break
        current_fids = {lv["fid"] for lv in real}
        vanished = {fid for fid in st.prev_vars if fid not in current_fids}
        owner_line = {}
        owner_gone = {}
        for mfid, m in st.meta.items():
            if m.get("objectId") and mfid in st.fid_line:
                owner_line[m["objectId"]] = st.fid_line[mfid]
                owner_gone[m["objectId"]] = mfid in vanished

        pre_heap = []  # changes made by a call that has just returned
        heap_ev, class_ev, call_ev, out_ev = [], [], [], []
        gone_ev, ret_ev, var_ev, loop_ev, exc_ev = [], [], [], [], []

        # --- exceptions seen by the tracer
        cond_ev = []
        for name, message in st.pending_exc:
            ev(exc_ev, "exception_raised", line_done, errorType=name, message=message)
            st.active_exc = (name, message)
        st.pending_exc = []

        # --- objects, lists, dicts: creation and changes
        heap = scan([lv["locals"] for lv in real], reg)
        for label, h in sorted(heap.items(), key=lambda kv: reg.order.get(kv[0], 0)):
            old = st.prev_heap.get(label)
            if label not in st.known:
                st.known.add(label)
                if h["kind"] == "obj":
                    ev(heap_ev, "object_created", base, objectId=label, className=h["cls"])
                    old = {"kind": "obj", "attrs": {}}
                elif h["kind"] == "list":
                    ev(heap_ev, "list_created", base, listId=label)
                    old = {"kind": "list", "items": []}
                elif h["kind"] == "dict":
                    ev(heap_ev, "dict_created", base, dictId=label)
                    old = {"kind": "dict", "pairs": []}
                elif h["kind"] == "tuple":
                    ev(heap_ev, "tuple_created", base, tupleId=label, items=h["items"])
                    old = None
                else:
                    ev(heap_ev, "set_created", base, setId=label)
                    old = {"kind": "set", "items": []}
            if old is None:
                continue

            if h["kind"] == "obj":
                for name, e in h["attrs"].items():
                    if name not in old["attrs"] or old["attrs"][name] != e:
                        ev(pre_heap if owner_gone.get(label) else heap_ev, "attribute_assigned", owner_line.get(label, base), objectId=label,
                           name=name, value=e, old=old["attrs"].get(name))
                for name in old["attrs"]:
                    if name not in h["attrs"]:
                        ev(pre_heap if owner_gone.get(label) else heap_ev, "attribute_deleted", owner_line.get(label, base), objectId=label, name=name)
            elif h["kind"] == "list":
                diff_list(heap_ev, label, base, old["items"], h["items"])
            elif h["kind"] == "dict":
                old_map = {key_of(k): (k, v) for k, v in old["pairs"]}
                new_map = {key_of(k): (k, v) for k, v in h["pairs"]}
                for kk, (k, v) in new_map.items():
                    if kk not in old_map:
                        ev(heap_ev, "key_added", base, dictId=label, key=k, value=v)
                    elif old_map[kk][1] != v:
                        ev(heap_ev, "key_updated", base, dictId=label, key=k,
                           old=old_map[kk][1], value=v)
                for kk, (k, v) in old_map.items():
                    if kk not in new_map:
                        ev(heap_ev, "key_removed", base, dictId=label, key=k)
            elif h["kind"] == "set":
                old_keys = {key_of(i) for i in old["items"]}
                new_keys = {key_of(i) for i in h["items"]}
                for i in h["items"]:
                    if key_of(i) not in old_keys:
                        ev(heap_ev, "set_added", base, setId=label, value=i)
                for i in old["items"]:
                    if key_of(i) not in new_keys:
                        ev(heap_ev, "set_removed", base, setId=label, value=i)
        st.prev_heap = heap

        # --- class bodies: blueprint grows method by method
        cb_now = set()
        for cb in cbs:
            cb_now.add(cb["fid"])
            fnames = [k for k, v in cb["locals"].items() if isinstance(v, types.FunctionType)]
            if cb["fid"] not in st.prev_cb:
                ev(class_ev, "class_started", line_done, name=cb["name"])
                st.prev_cb[cb["fid"]] = set()
                st.cb_names[cb["fid"]] = cb["name"]
            for n in fnames:
                if n not in st.prev_cb[cb["fid"]]:
                    st.prev_cb[cb["fid"]].add(n)
                    ev(class_ev, "method_defined", line_done, className=cb["name"], name=n)
        for fid in list(st.prev_cb):
            if fid not in cb_now:
                for n in st.cb_final.pop(fid, []):
                    if n not in st.prev_cb[fid]:
                        ev(class_ev, "method_defined", line_done,
                           className=st.cb_names.get(fid, "?"), name=n)
                del st.prev_cb[fid]

        # --- new classes and functions at module level
        module = next((lv for lv in real if lv["name"] == "<module>"), None)
        if module is not None:
            for name, v in module["locals"].items():
                if name.startswith("__"):
                    continue
                if isinstance(v, type) and v.__module__ == "__main__" and name not in st.classes:
                    st.classes.add(name)
                    bases = [b.__name__ for b in v.__bases__ if b is not object]
                    decl = next((ln for ln, nm in class_lines.items() if nm == name), line_done)
                    ev(class_ev, "class_defined", decl, name=name, bases=bases,
                       methods=[k for k, x in vars(v).items() if isinstance(x, types.FunctionType)])
                    for b in bases:
                        ev(class_ev, "inheritance_detected", line_done, child=name, parent=b)
                elif isinstance(v, types.FunctionType) and v.__module__ == "__main__" and name not in st.funcs:
                    st.funcs.add(name)
                    ev(class_ev, "function_defined", line_done, name=name,
                       params=list(v.__code__.co_varnames[: v.__code__.co_argcount]))

        # --- new function and method frames
        for depth, lv in enumerate(real):
            if lv["fid"] in st.prev_vars or lv["name"] == "<module>":
                continue
            f = lv["frame"]
            code = f.f_code
            so = self_obj(f)
            call_line = line_done
            if depth > 0:
                call_line = st.fid_line.get(real[depth - 1]["fid"], line_done)
            argnames = [a for a in code.co_varnames[: code.co_argcount] if a != "self"]
            args = {a: enc(lv["locals"][a], reg) for a in argnames if a in lv["locals"]}
            if so is not None:
                oid = reg.label(so, type(so).__name__)
                st.meta[lv["fid"]] = {"name": code.co_name, "objectId": oid, "className": type(so).__name__}
                ev(call_ev, "method_called", call_line, objectId=oid,
                   className=type(so).__name__, name=code.co_name,
                   definedIn=defined_in(so, code), args=args,
                   isConstructor=(code.co_name == "__init__"), depth=depth)
            else:
                st.meta[lv["fid"]] = {"name": code.co_name, "objectId": None, "className": None}
                ev(call_ev, "function_called", call_line, name=code.co_name, args=args, depth=depth)

        # --- printed text
        text = out.getvalue()[len(st.prev_out):]
        st.prev_out = out.getvalue()
        out_after = False
        if text:
            w0 = st.writes[0] if st.writes else None
            # printed by a frame that is still running: it happened after any call that just returned
            out_after = bool(w0) and w0["fid"] in current_fids
            ev(out_ev, "output", w0["line"] if w0 else line_done,
               text=text.rstrip("\n"), objectId=w0["owner"] if w0 else None)
        st.writes = []

        # --- frames that finished
        for fid in reversed(list(st.prev_vars)):
            if fid in current_fids:
                continue
            for lp in reversed(st.loops.pop(fid, [])):
                if lp["in_iter"]:
                    ev(gone_ev, "iteration_finished", line_done, loopLine=lp["line"], index=lp["index"])
                ev(gone_ev, "loop_finished", line_done, loopLine=lp["line"], iterations=lp["index"])
            meta = st.meta.pop(fid, {"name": "?", "objectId": None, "className": None})
            r = st.returns.pop(fid, None)
            value = r["value"] if r else None
            type_ = "method_returned" if meta["objectId"] else "function_returned"
            ev(ret_ev, type_, st.fid_line.get(fid, line_done), name=meta["name"], objectId=meta["objectId"],
               className=meta["className"], value=value)
            del st.prev_vars[fid]

        # --- variables
        for lv in real:
            cur = {
                n: enc(v, reg)
                for n, v in lv["locals"].items()
                if not n.startswith("__")
                and not isinstance(v, (types.FunctionType, type, types.ModuleType))
            }
            old = st.prev_vars.get(lv["fid"])
            if old is not None:
                scope = "global" if lv["name"] == "<module>" else "local"
                for n, e in cur.items():
                    if n not in old:
                        ev(var_ev, "variable_created", st.fid_line.get(lv["fid"], line_done), scope=scope,
                           function=lv["name"], name=n, value=e)
                    elif old[n] != e:
                        ev(var_ev, "variable_updated", st.fid_line.get(lv["fid"], line_done), scope=scope,
                           function=lv["name"], name=n, old=old[n], value=e)
                for n in old:
                    if n not in cur:
                        ev(var_ev, "variable_deleted", st.fid_line.get(lv["fid"], line_done), scope=scope,
                           function=lv["name"], name=n)
            st.prev_vars[lv["fid"]] = cur

        # --- loops in the frame that is about to run a line
        if final:
            for fid in list(st.loops):
                for lp in reversed(st.loops[fid]):
                    if lp["in_iter"]:
                        ev(loop_ev, "iteration_finished", line_done, loopLine=lp["line"], index=lp["index"])
                    ev(loop_ev, "loop_finished", line_done, loopLine=lp["line"], iterations=lp["index"])
            st.loops = {}
        elif real:
            top = real[-1]
            L = top["frame"].f_lineno
            lline = st.fid_line.get(top["fid"], line_done)
            active = st.loops.setdefault(top["fid"], [])

            while active and not (active[-1]["line"] <= L <= active[-1]["end"]):
                lp = active.pop()
                if lp["in_iter"]:
                    ev(loop_ev, "iteration_finished", lline, loopLine=lp["line"], index=lp["index"])
                ev(loop_ev, "loop_finished", lline, loopLine=lp["line"], iterations=lp["index"])

            if active and active[-1]["line"] < L <= active[-1]["end"] and not active[-1]["in_iter"]:
                lp = active[-1]
                lp["index"] += 1
                lp["in_iter"] = True
                value = None
                if lp["target"] and lp["target"] in top["locals"]:
                    value = enc(top["locals"][lp["target"]], reg)
                ev(loop_ev, "iteration_started", lline, loopLine=lp["line"],
                   index=lp["index"], variable=lp["target"], value=value)

            pend = st.pending_if.pop(top["fid"], None)
            if pend is not None:
                b0, b1 = pend["body"]
                result, branch = False, "none"
                if b0 <= L <= b1:
                    result, branch = True, pend["kind"]
                elif pend["orelse"] and pend["orelse"][0] <= L <= pend["orelse"][1]:
                    branch = "next" if pend["elif_next"] else "else"
                ev(cond_ev, "condition_checked", pend["line"], test=pend["test"],
                   result=result, branch=branch)
                if branch != "next":
                    ev(cond_ev, "branch_selected", pend["line"], branch=branch, firstLine=L)
            ih = if_headers.get(L)
            if ih is not None:
                st.pending_if[top["fid"]] = dict(ih, line=L)

            if st.active_exc is not None:
                for hd in handlers:
                    if hd["line"] < L <= hd["end"]:
                        ev(exc_ev, "exception_handled", line_done,
                           errorType=st.active_exc[0], handler=hd["type"])
                        st.active_exc = None
                        break

            h = loop_headers.get(L)
            if h:
                if active and active[-1]["line"] == L:
                    lp = active[-1]
                    if lp["in_iter"]:
                        lp["in_iter"] = False
                        ev(loop_ev, "iteration_finished", lline, loopLine=L, index=lp["index"])
                else:
                    total = h["range_total"]
                    source_id = None
                    src = top["locals"].get(h["source_name"]) if h["source_name"] else None
                    if isinstance(src, (list, tuple, dict, set, str)):
                        total = len(src)
                        if not isinstance(src, str):
                            source_id = reg.label(src, type(src).__name__ if is_user_object(src) else
                                                  ("list" if isinstance(src, list) else
                                                   "tuple" if isinstance(src, tuple) else
                                                   "set" if isinstance(src, set) else "dict"))
                    active.append({"line": L, "end": h["end"], "target": h["target"],
                                   "index": 0, "in_iter": False})
                    ev(loop_ev, "loop_started", L, loopLine=L, kind=h["kind"],
                       variable=h["target"], source=h["source"], sourceId=source_id, total=total)

        # --- uncaught error
        if final and error:
            if not any(e["type"] == "exception_raised" for e in exc_ev):
                name, _, message = error.partition(": ")
                ev(exc_ev, "exception_raised", line_done, errorType=name, message=message)

        # what happened, in the order it happened: first whatever the finished calls did
        # and returned, then anything new that the surviving line started
        if out_after:
            first = cond_ev + pre_heap + gone_ev + ret_ev + out_ev
        else:
            first = cond_ev + pre_heap + out_ev + gone_ev + ret_ev
        return first + heap_ev + class_ev + call_ev + var_ev + loop_ev + exc_ev

    def make_level(f):
        return {
            "fid": st.fid_map.get(id(f), id(f)),
            "name": f.f_code.co_name,
            "frame": f,
            "locals": dict(f.f_locals),
            "cb": is_class_body(f),
        }

    def record(frame):
        nonlocal busy
        busy = True
        try:
            if len(frames) >= max_steps:
                raise StepLimit()
            chain = collect(frame)
            levels = [make_level(f) for f in chain]
            if st.module_fid is None and levels and levels[0]["name"] == "<module>":
                st.module_fid = levels[0]["fid"]

            shown = chain if len(chain) <= 40 else chain[:1] + chain[-39:]
            stack = [
                {"name": f.f_code.co_name, "line": f.f_lineno, "vars": snapshot(f.f_locals)}
                for f in shown
            ]
            events = compute(levels, st.prev_line, False, None)
            frames.append(
                {
                    "line": frame.f_lineno,
                    "stack": stack,
                    "output": clip(out.getvalue()),
                    "events": events,
                }
            )
            st.prev_line = frame.f_lineno
            st.fid_line = {lv["fid"]: lv["frame"].f_lineno for lv in levels}
        finally:
            busy = False

    def note_return(frame, arg):
        nonlocal busy
        busy = True
        try:
            fid = st.fid_map.get(id(frame), id(frame))
            if is_class_body(frame):
                st.cb_final[fid] = [
                    k for k, v in frame.f_locals.items()
                    if isinstance(v, types.FunctionType)
                ]
            else:
                st.returns[fid] = {"value": enc(arg, reg)}
        finally:
            busy = False

    def note_exception(arg):
        exc = arg[1]
        if id(exc) in st.exc_seen:
            return
        st.exc_seen.add(id(exc))
        st.pending_exc.append((type(exc).__name__, str(exc)))

    def tracer(frame, event, arg):
        if busy or frame.f_code.co_filename != "<user>":
            return None
        if event == "call":
            st.fid_counter += 1
            st.fid_map[id(frame)] = st.fid_counter
        elif event == "line":
            record(frame)
        elif event == "return":
            note_return(frame, arg)
        elif event == "exception":
            note_exception(arg)
        return tracer

    error = None
    old_stdout = sys.stdout
    sys.stdout = out
    warnings.simplefilter("ignore", RuntimeWarning)
    sys.settrace(tracer)
    try:
        exec(code_obj, g)
    except StepLimit:
        error = "Stopped: too many steps (possible infinite loop)"
    except BaseException as e:
        error = type(e).__name__ + ": " + str(e)
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    busy = True
    final_level = {
        "fid": st.module_fid if st.module_fid is not None else 0,
        "name": "<module>",
        "frame": None,
        "locals": dict(g),
        "cb": False,
    }
    try:
        final_events = compute([final_level], st.prev_line, True, error)
    except Exception:
        final_events = []
    frames.append(
        {
            "line": None,
            "stack": [{"name": "<module>", "line": None, "vars": snapshot(g)}],
            "output": clip(out.getvalue()),
            "events": final_events,
        }
    )
    busy = False
    return json.dumps(
        {"schemaVersion": SCHEMA_VERSION, "frames": frames, "error": error},
        default=str,
    )


# ---------------------------------------------------------------
# Practice challenges: run the learner's code, then evaluate test
# expressions such as add(2, 3) and report what each one returned.
# ---------------------------------------------------------------

def run_checks(user_code, exprs):
    results = []
    g = {"__name__": "__main__"}
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    try:
        try:
            exec(compile(user_code, "<user>", "exec"), g)
        except BaseException as e:
            return json.dumps(
                {"error": type(e).__name__ + ": " + str(e), "results": []}
            )
        for expr in exprs:
            try:
                results.append({"expr": expr, "value": repr(eval(expr, g))})
            except BaseException as e:
                results.append(
                    {"expr": expr, "error": type(e).__name__ + ": " + str(e)}
                )
    finally:
        sys.stdout = old_stdout
    return json.dumps({"error": None, "results": results})
