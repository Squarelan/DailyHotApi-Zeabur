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

  // ✅ 用 JSON API，不再解析 HTML 注释
  const url = `https://top.baidu.com/api/board?tab=${type}`;

  const result = await get({
    url,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile Safari/605.1.15",
      Referer: "https://top.baidu.com/board",
    },
  });

  const list: RouterType["baidu"][] = result.data?.data?.cards?.[0]?.content ?? [];

  return {
    ...result,
    data: list.map((v) => ({
      id: v.index,
      title: v.word,
      desc: v.desc,
      cover: v.img,
      author: v.show?.length ? v.show : "",
      timestamp: 0,
      hot: Number(v.hotScore || 0),
      // ✅ query 可能缺失，用 word 兜底，避免 wd=undefined
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(v.query || v.word)}`,
      mobileUrl: v.rawUrl || `https://www.baidu.com/s?wd=${encodeURIComponent(v.query || v.word)}`,
    })),
  };
};
