#define PI 3.14159
#define STEPS 100
#define MAX_MARCH 1000.0
#define HIT_DISTANCE 0.01

#define LIGHT_DIRECTION normalize(vec3(0.8, 1, 1))
#define LIGHT_COLOR vec3(1, 1, 1)

#define DISTANCE 24.0

vec3[4] PALETTE = vec3[](vec3(0.6, 0.8, 0.7), vec3(0.9, 0.2, 0.2), vec3(0.2, 0.2, 0.9),
                         vec3(0.2, 0.9, 0.2));


float sdPlane(vec3 p) {
    return p.y;
}

float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdCylinder(vec3 p, vec2 s)
{
    vec2 d = abs(vec2(length(p.xz),p.y)) - s;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdCube(vec3 p, vec3 s) {
    vec3 d = abs(p) - s;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sdCone(vec3 p, vec3 s) {
    return 0.0;
}

vec2 select(vec2 d1, vec2 d2) {
    return (d1.x < d2.x) ? d1 : d2;
}

vec2 world(vec3 p) {
    vec2 res = vec2(p.y, -1);
    
    float plane = sdPlane(p);
    float sphere = sdSphere(p - vec3(0, 2, 0), 2.0);
    float cylinder = sdCylinder(p - vec3(6, 3.0 + sin(iTime * 2.0), 0), vec2(2.0, 2.0));
    float box = sdCube(p - vec3(-6, 3.0 + cos(iTime * 2.0), 0), vec3(2.0, 2.0, 2.0));
    
    res = select(res, vec2(plane, 0));
    res = select(res, vec2(sphere, 1));
    res = select(res, vec2(cylinder, 2));
    res = select(res, vec2(box, 3));

    return res;
}

vec3 get_normal(in vec3 p) {
    const vec3 s = vec3(0.001, 0.0, 0.0);

    float g_x = world(p + s.xyy).x - world(p - s.xyy).x;
    float g_y = world(p + s.yxy).x - world(p - s.yxy).x;
    float g_z = world(p + s.yyx).x - world(p - s.yyx).x;

    vec3 normal = vec3(g_x, g_y, g_z);

    return normalize(normal);
}

vec3 specular(vec3 cam, vec3 pos, vec3 normal) {
    vec3 viewDir = normalize(cam - pos);
    vec3 reflectDir = reflect(-LIGHT_DIRECTION, normal);
    
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    return 0.5 * spec * LIGHT_COLOR;
}

vec3 diffuse(vec3 normal) {
    float diffuse = (dot(LIGHT_DIRECTION, normal) + 1.0) / 2.0;
    return diffuse * LIGHT_COLOR;
}

vec4 raymarch(in vec3 ro, in vec3 rd) {
    float traveled = 0.03;
    
    vec3 p = ro;

    for (int i = 0; i < STEPS; i++) {
        p = ro + traveled * rd;
        
        vec2 world = world(p);
    
        float max_travel = world.x;
        
        if (max_travel < HIT_DISTANCE) {
            return vec4(p, world.y);
        }
        
        if (traveled > MAX_MARCH) {
            break;
        }
        
        traveled += max_travel;
    }
    return vec4(p, -1);
}

float shadow(vec3 ro, vec3 rd) {
    float traveled = 1.0;
    
    float res = 1.0;
    
    for (int i = 0; i < STEPS; i++) {
        vec2 world = world(ro + traveled * rd);
        
        float max_travel = world.x;
        
        if (max_travel < HIT_DISTANCE) {
            return 0.0;
        }
        
        res = min(res, 2.0 * max_travel / traveled);
        
        traveled += max_travel;
    }
    
    return res;
}

vec4 render(vec2 uv, float time) {
    uv *= 0.8;

    vec3 ro = vec3(cos(time) * DISTANCE, DISTANCE * 5.0 / 12.0, sin(time) * DISTANCE);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    float d = PI/8.0;
    
    mat3 rx = mat3(1,       0,      0,
                   0,  cos(d), sin(d),
                   0, -sin(d), cos(d));
                  
    d = -time - PI / 2.0;
    
    mat3 ry = mat3(cos(d), 0, -sin(d),
                        0, 1,       0,
                   sin(d), 0,  cos(d));
                   
    rd = ry * rx * rd;
    
    vec4 march = raymarch(ro, rd);
    
    vec3 pos = march.xyz;
    vec3 normal = get_normal(pos);
    
    vec3 lighting = diffuse(normal) + specular(ro, pos, normal);
    
    float shadow_cast = shadow(pos, LIGHT_DIRECTION);
    
    if (march.w < 0.1) {
        float checker = ((int(floor(pos.x)) + int(floor(pos.z))) % 2 == 0) ? 0.0 : 0.1;
        float damped = checker * (1.0 - (length(pos - ro) / MAX_MARCH));
        
        lighting = (0.9 + damped) * lighting;
    }
    
    vec3 col = shadow_cast * lighting * PALETTE[int(march.w)];
    
    return vec4(col, 1);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord - iResolution.xy / 2.0) / iResolution.y;
    
    vec4 col = render(uv, iTime / 2.0);

    fragColor = col;
}


