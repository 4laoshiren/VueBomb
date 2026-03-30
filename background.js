// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "openAllUrls") {
        openAllUrls(request.urls);
        sendResponse({ status: "ok" });
    }
    return true;
});

function openAllUrls(urls) {
    if (!urls || urls.length === 0) return;

    const newTabIds = [];
    let openedCount = 0;

    urls.forEach((url) => {
        chrome.tabs.create({ url: url, active: false }, function (tab) {
            if (chrome.runtime.lastError) {
                console.error("创建标签页失败:", chrome.runtime.lastError);
                openedCount++;
                return;
            }
            newTabIds.push(tab.id);
            openedCount++;

            // 监听tab加载完成，等content script清除守卫后再跳转
            const targetUrl = url;
            function onTabUpdated(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(onTabUpdated);
                    // 等待content script注入并清除路由守卫
                    setTimeout(() => {
                        chrome.scripting
                            .executeScript({
                                target: { tabId: tab.id },
                                func: (href) => {
                                    location.href = href;
                                },
                                args: [targetUrl],
                            })
                            .catch((err) =>
                                console.error("执行脚本失败:", err)
                            );
                    }, 3000);
                }
            }
            chrome.tabs.onUpdated.addListener(onTabUpdated);

            // 所有tab创建完毕后分组
            if (openedCount === urls.length && newTabIds.length > 0) {
                chrome.tabs.group({ tabIds: newTabIds }, function (groupId) {
                    if (!chrome.runtime.lastError) {
                        chrome.tabGroups.update(groupId, {
                            title: "VueBomb",
                            color: "green",
                        });
                    }
                });
            }
        });
    });
}
