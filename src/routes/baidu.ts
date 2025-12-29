import type { RouterData, ListContext, Options, RouterResType } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";

const typeMap: Record<string, string> = {
  realtime: "热搜",
  novel: "小说",
  movie: "电影",
  teleplay: "电视剧",
  car: "汽车",
  game: "游戏",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const type = c.req.query("type") || "realtime";
  const listData = await getList({ type }, noCache);
  const routeData: RouterData = {
    name: "baidu",
    title: "百度",
    type: typeMap[type],
    params: {
      type: {
        name: "热搜类别",
        type: typeMap,
      },
    },
    link: "https://top.baidu.com/board",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (options: Options, noCache: boolean): Promise<RouterResType> => {
  const { type } = options;

  const url = `https://top.baidu.com/api/board?tab=${type}`;

  const result = await get({
    url,
    noCache, // ✅ 恢复正常：由外部决定是否绕过缓存
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Referer: `https://top.baidu.com/board?tab=${type}`,
    },
  });

  // ✅ 返回 HTML（被拦截/跳转）就直接返回空
  if (typeof result.data === "string") {
    return { ...result, fromCache: false, data: [] };
  }

  const cards = result.data?.data?.cards ?? result.data?.cards ?? [];
  const content = cards?.[0]?.content;

  // ✅ JSON 但结构不对也直接返回空，避免缓存污染/脏数据
  if (!Array.isArray(content)) {
    return { ...result, fromCache: false, data: [] };
  }

  const list: RouterType["baidu"][] = content;

  return {
    ...result,
    data: list.map((v) => {
      const q = v.query || v.word || "";
      const searchUrl = q
        ? `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`
        : "https://top.baidu.com/board";

      return {
        id: String(q || v.index),
        title: v.word || q,
        desc: v.desc || "",
        cover: v.img || "",
        author: v.show?.length ? v.show : "",
        timestamp: 0,
        hot: Number(v.hotScore || 0),
        url: searchUrl,
        mobileUrl: v.rawUrl || searchUrl,
      };
    }),
  };
};
