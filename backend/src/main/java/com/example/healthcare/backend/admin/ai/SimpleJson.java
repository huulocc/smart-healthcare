package com.example.healthcare.backend.admin.ai;

import java.util.*;

/**
 * Lightweight, zero-dependency JSON parser for Google Cloud API responses.
 * Parses JSON strings into Map&lt;String, Object&gt;, List&lt;Object&gt;, String, Number, Boolean, and null.
 */
public final class SimpleJson {

    private final String src;
    private final int len;
    private int idx = 0;

    private SimpleJson(String src) {
        this.src = src != null ? src : "";
        this.len = this.src.length();
    }

    public static Object parse(String json) {
        if (json == null || json.trim().isEmpty()) {
            return null;
        }
        return new SimpleJson(json.trim()).parseValue();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseObject(String json) {
        Object res = parse(json);
        if (res instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    public static List<Object> parseArray(String json) {
        Object res = parse(json);
        if (res instanceof List<?> l) {
            return (List<Object>) l;
        }
        return Collections.emptyList();
    }

    private Object parseValue() {
        skipWhitespace();
        if (idx >= len) return null;
        char c = src.charAt(idx);
        return switch (c) {
            case '{' -> parseObject();
            case '[' -> parseArray();
            case '"', '\'' -> parseString();
            case 't', 'f' -> parseBoolean();
            case 'n' -> parseNull();
            default -> parseNumber();
        };
    }

    private Map<String, Object> parseObject() {
        Map<String, Object> map = new LinkedHashMap<>();
        idx++; // skip '{'
        skipWhitespace();
        if (idx < len && src.charAt(idx) == '}') {
            idx++;
            return map;
        }
        while (idx < len) {
            skipWhitespace();
            String key = parseString();
            skipWhitespace();
            if (idx < len && src.charAt(idx) == ':') {
                idx++; // skip ':'
            }
            Object val = parseValue();
            map.put(key, val);
            skipWhitespace();
            if (idx < len && src.charAt(idx) == ',') {
                idx++; // skip ','
            } else if (idx < len && src.charAt(idx) == '}') {
                idx++;
                break;
            }
        }
        return map;
    }

    private List<Object> parseArray() {
        List<Object> list = new ArrayList<>();
        idx++; // skip '['
        skipWhitespace();
        if (idx < len && src.charAt(idx) == ']') {
            idx++;
            return list;
        }
        while (idx < len) {
            Object val = parseValue();
            list.add(val);
            skipWhitespace();
            if (idx < len && src.charAt(idx) == ',') {
                idx++;
            } else if (idx < len && src.charAt(idx) == ']') {
                idx++;
                break;
            }
        }
        return list;
    }

    private String parseString() {
        char quote = src.charAt(idx);
        idx++; // skip quote
        StringBuilder sb = new StringBuilder();
        while (idx < len) {
            char c = src.charAt(idx++);
            if (c == quote) {
                break;
            }
            if (c == '\\' && idx < len) {
                char next = src.charAt(idx++);
                switch (next) {
                    case '"' -> sb.append('"');
                    case '\'' -> sb.append('\'');
                    case '\\' -> sb.append('\\');
                    case '/' -> sb.append('/');
                    case 'b' -> sb.append('\b');
                    case 'f' -> sb.append('\f');
                    case 'n' -> sb.append('\n');
                    case 'r' -> sb.append('\r');
                    case 't' -> sb.append('\t');
                    case 'u' -> {
                        if (idx + 4 <= len) {
                            String hex = src.substring(idx, idx + 4);
                            idx += 4;
                            sb.append((char) Integer.parseInt(hex, 16));
                        }
                    }
                    default -> sb.append(next);
                }
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private Boolean parseBoolean() {
        if (src.startsWith("true", idx)) {
            idx += 4;
            return Boolean.TRUE;
        }
        if (src.startsWith("false", idx)) {
            idx += 5;
            return Boolean.FALSE;
        }
        return null;
    }

    private Object parseNull() {
        if (src.startsWith("null", idx)) {
            idx += 4;
        }
        return null;
    }

    private Number parseNumber() {
        int start = idx;
        if (idx < len && (src.charAt(idx) == '-' || src.charAt(idx) == '+')) {
            idx++;
        }
        boolean isFloating = false;
        while (idx < len) {
            char c = src.charAt(idx);
            if (Character.isDigit(c)) {
                idx++;
            } else if (c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-') {
                isFloating = true;
                idx++;
            } else {
                break;
            }
        }
        String numStr = src.substring(start, idx).trim();
        try {
            if (isFloating) {
                return Double.parseDouble(numStr);
            }
            return Long.parseLong(numStr);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private void skipWhitespace() {
        while (idx < len && Character.isWhitespace(src.charAt(idx))) {
            idx++;
        }
    }

    // Helper navigation utilities
    @SuppressWarnings("unchecked")
    public static Map<String, Object> getMap(Map<String, Object> map, String key) {
        if (map == null) return Collections.emptyMap();
        Object val = map.get(key);
        return (val instanceof Map<?, ?> m) ? (Map<String, Object>) m : Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    public static List<Object> getList(Map<String, Object> map, String key) {
        if (map == null) return Collections.emptyList();
        Object val = map.get(key);
        return (val instanceof List<?> l) ? (List<Object>) l : Collections.emptyList();
    }

    public static String getString(Map<String, Object> map, String key, String defaultVal) {
        if (map == null) return defaultVal;
        Object val = map.get(key);
        return val != null ? val.toString() : defaultVal;
    }

    public static Long getLong(Map<String, Object> map, String key, Long defaultVal) {
        if (map == null) return defaultVal;
        Object val = map.get(key);
        if (val instanceof Number n) return n.longValue();
        if (val instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
            }
        }
        return defaultVal;
    }

    public static Double getDouble(Map<String, Object> map, String key, Double defaultVal) {
        if (map == null) return defaultVal;
        Object val = map.get(key);
        if (val instanceof Number n) return n.doubleValue();
        if (val instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {
            }
        }
        return defaultVal;
    }
}
