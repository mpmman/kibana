[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ScopedClusterClient](./kibana-plugin-server.scopedclusterclient.md)

## ScopedClusterClient class

Serves the same purpose as "normal" `ClusterClient` but exposes additional `callAsCurrentUser` method that doesn't use credentials of the Kibana internal user (as `callAsInternalUser` does) to request Elasticsearch API, but rather passes HTTP headers extracted from the current user request to the API

<b>Signature:</b>

```typescript
export declare class ScopedClusterClient 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [callAsCurrentUser(endpoint, clientParams, options)](./kibana-plugin-server.scopedclusterclient.callascurrentuser.md) |  | Calls specified <code>endpoint</code> with provided <code>clientParams</code> on behalf of the user initiated request to the Kibana server (via HTTP request headers). |
|  [callAsInternalUser(endpoint, clientParams, options)](./kibana-plugin-server.scopedclusterclient.callasinternaluser.md) |  | Calls specified <code>endpoint</code> with provided <code>clientParams</code> on behalf of the Kibana internal user. |

