import pygame, random, sys
import os

# --- Persistence and Global Variables ---
COINS_FILE = "/Users/alanalo/Desktop/GG/coins.txt"

def load_coins():
    if os.path.exists(COINS_FILE):
        with open(COINS_FILE, "r") as f:
            try:
                return int(f.read().strip())
            except:
                return 1000
    return 1000

def save_coins():
    with open(COINS_FILE, "w") as f:
        f.write(str(coins))

pygame.init()
# Add global camera offset variable (will be updated in main loop)
CAMERA_OFFSET = (0, 0)

# NEW GLOBAL CONFIGURATION:
WIDTH, HEIGHT, FPS = 1200, 800, 60
LANE_COUNT, LANE_WIDTH = 3, 250
BRIDGE_WIDTH = LANE_COUNT * LANE_WIDTH
BRIDGE_X = (WIDTH - BRIDGE_WIDTH) // 2
WHITE, BLACK = (255,255,255), (0,0,0)
BRIDGE_COLOR, WATER_COLOR = (100,100,100), (50,150,200)
PLAYER_COLOR, ENEMY_COLOR = (0,120,255), (255,50,50)
GATE_COLOR, PROJ_COLOR, BOSS_COLOR = (50,255,50), (255,255,0), (200,0,0)
SCROLL_SPEED, BG_SPEED, PROJ_SPEED = 4, 2, -10
ENEMY_SPEED, GATE_SPEED, BOSS_SPEED = SCROLL_SPEED - 1, SCROLL_SPEED + 1, SCROLL_SPEED * 0.3
enemy_health_multiplier, start_level = 1, 1
FONT = pygame.font.SysFont('Arial', 24)
LARGE_FONT = pygame.font.SysFont('Arial', 36)
lane_positions = [BRIDGE_X + LANE_WIDTH * i + (LANE_WIDTH - 40) // 2 for i in range(LANE_COUNT)]
def fmt(n): return int(round(n))
CRIT_CHANCE = 0.2  # Critical hit chance constant

# New persistent coins settings:
coins = load_coins()

# --- Extended Classes from FullCodeAdGame.py ---
class GameSprite(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        # Default depth if not overridden
        self.z = 0
    def draw(self, screen):
        # Apply camera offset when drawing
        screen.blit(self.image, (self.rect.x - CAMERA_OFFSET[0], self.rect.y - CAMERA_OFFSET[1]))

class Player(GameSprite):
    def __init__(self):
        super().__init__()
        self.z = 0  # depth per requirement
        self.level = 1
        self.width = 40; self.height = 40
        self.lane = LANE_COUNT // 2  # Changed from 0 to middle lane
        self.x = lane_positions[self.lane]
        self.y = HEIGHT - self.height - 30
        self.image = pygame.Surface((self.width, self.height))
        self.image.fill(PLAYER_COLOR)
        self.rect = self.image.get_rect(topleft=(self.x, self.y))
        self.shoot_cd = 0
        self.auto_timer = 0
        self.weapon = "basic"
        self.weapon_upgraded = False
        self.gate_collision = 0
    def move(self, dir):
        self.lane = max(0, min(LANE_COUNT-1, self.lane+dir))
        self.rect.x = lane_positions[self.lane]
    def update(self):
        if self.shoot_cd:
            self.shoot_cd -= 1
        self.auto_timer += 1
        threshold = 60 / (1 + 0.02*(self.level - 1))
        if self.auto_timer >= threshold:
            self.auto_timer = 0
            return True
        return False
    def draw(self, screen):
        super().draw(screen)
        txt = FONT.render(f"Lvl: {fmt(self.level)}", True, WHITE)
        screen.blit(txt, (self.rect.x - CAMERA_OFFSET[0], self.rect.y - 25 - CAMERA_OFFSET[1]))

class Projectile(GameSprite):
    def __init__(self, x, y, weapon="basic"):
        super().__init__()
        self.z = 0  # projectile depth
        self.width, self.height = 8, 16
        self.image = pygame.Surface((self.width, self.height))
        if weapon=="upgraded":
            self.image.fill((255,100,0))
            self.speed = PROJ_SPEED - 2
        else:
            self.image.fill(PROJ_COLOR)
            self.speed = PROJ_SPEED
        self.rect = self.image.get_rect(topleft=(x+16, y))
    def update(self):
        self.rect.y += self.speed

class Enemy(GameSprite):
    def __init__(self, lane, gate_collision):
        super().__init__()
        self.z = 0  # enemy depth
        self.width = self.height = 30
        self.image = pygame.Surface((self.width, self.height))
        self.image.fill(ENEMY_COLOR)
        self.rect = self.image.get_rect(topleft=(lane_positions[lane] + 5, -30))
        lvl_mult = 1.2 ** (start_level - 1)
        gate_mult = 2.0 ** (gate_collision - 1) if gate_collision > 1 else 1
        self.health = 5 * lvl_mult * enemy_health_multiplier * gate_mult
        self.max_health = self.health
        self.speed = ENEMY_SPEED
    def update(self):
        self.rect.y += self.speed
    def draw(self, screen):
        # Draw enemy image with camera offset
        screen.blit(self.image, (self.rect.x - CAMERA_OFFSET[0], self.rect.y - CAMERA_OFFSET[1]))
        bar_width = self.rect.width
        health_ratio = self.health/self.max_health if self.max_health else 0
        bar = pygame.Rect(self.rect.x - CAMERA_OFFSET[0], self.rect.y - 7 - CAMERA_OFFSET[1], int(bar_width*health_ratio), 5)
        pygame.draw.rect(screen, (0,255,0), bar)
        pygame.draw.rect(screen, (255,0,0), (self.rect.x - CAMERA_OFFSET[0], self.rect.y - 7 - CAMERA_OFFSET[1], bar_width, 5), 1)
        txt = FONT.render(f"{fmt(self.health)}", True, BLACK)
        screen.blit(txt, txt.get_rect(center=(self.rect.centerx - CAMERA_OFFSET[0], self.rect.y - 5 - CAMERA_OFFSET[1])))

class Gate(GameSprite):
    def __init__(self, lane, enemy_kill_count):
        super().__init__()
        self.z = 0  # gate depth
        self.width, self.height = 200, 80
        extra = enemy_kill_count // 5
        if random.random() < 0.25:
            self.is_operator = True
            self.operator = random.choice(['+', '-', '*', '/'])
            self.index = random.randint(2, 5 + extra)
            self.display = f"{self.operator}{abs(self.index)}"
        else:
            self.is_operator = False
            self.value = random.choice([random.randint(2, 5+extra), -random.randint(1,5+extra)])
            self.display = f"{self.value:+d}"
        self.image = pygame.Surface((self.width, self.height))
        self.image.fill(GATE_COLOR)
        self.rect = self.image.get_rect(topleft=(lane_positions[lane] - (self.width-40)//2, -self.height))
        self.speed = GATE_SPEED
    def update(self):
        self.rect.y += self.speed
    def draw(self, screen):
        screen.blit(self.image, (self.rect.x - CAMERA_OFFSET[0], self.rect.y - CAMERA_OFFSET[1]))
        txt = FONT.render(self.display, True, BLACK)
        screen.blit(txt, txt.get_rect(center=(self.rect.centerx - CAMERA_OFFSET[0], self.rect.centery - CAMERA_OFFSET[1])))

class Boss(GameSprite):
    def __init__(self, player):  # Add player parameter
        super().__init__()
        self.z = 0  # boss depth
        self.width, self.height = 120, 120
        self.image = pygame.Surface((self.width, self.height))
        self.image.fill(BOSS_COLOR)
        self.rect = self.image.get_rect(topleft=((WIDTH - self.width)//2, -self.height*2))
        lvl_mult = 1.2 ** (start_level - 1)
        gate_mult = 2.0 ** max(0, player.gate_collision - 1)
        self.health = 250 * lvl_mult * enemy_health_multiplier * gate_mult
        self.max_health = self.health
        self.speed = BOSS_SPEED
    def update(self):
        self.rect.y += self.speed
    def draw(self, screen):
        screen.blit(self.image, (self.rect.x - CAMERA_OFFSET[0], self.rect.y - CAMERA_OFFSET[1]))
        txt = LARGE_FONT.render(f"{fmt(self.health)}", True, WHITE)
        screen.blit(txt, txt.get_rect(center=(self.rect.centerx - CAMERA_OFFSET[0], self.rect.y - 20 - CAMERA_OFFSET[1])))

class Particle:
    def __init__(self, x, y):
        self.x, self.y = x, y
        self.z = 0  # particle depth
        self.radius = random.randint(2,4)
        self.color = random.choice([(255,200,0),(255,150,0),(255,255,0)])
        self.dx, self.dy = random.uniform(-1,1), random.uniform(-1,1)
        self.lifetime = 20
    def update(self):
        self.x += self.dx; self.y += self.dy; self.lifetime -= 1
    def draw(self, screen):
        if self.lifetime > 0:
            pygame.draw.circle(screen, self.color, (int(self.x - CAMERA_OFFSET[0]), int(self.y - CAMERA_OFFSET[1])), self.radius)

# New: FloatingText class to display critical numbers
class FloatingText:
    def __init__(self, text, x, y, lifetime=30):
        self.text = text
        self.x = x
        self.y = y
        self.z = 0  # floating text depth
        self.lifetime = lifetime
    def update(self):
        self.y -= 1
        self.lifetime -= 1
    def draw(self, screen):
        if self.lifetime > 0:
            txt = FONT.render(self.text, True, (255,0,0))
            screen.blit(txt, (self.x - CAMERA_OFFSET[0], self.y - CAMERA_OFFSET[1]))

# New function: draw main menu
def draw_main_menu(screen):
    screen.fill((30,30,30))
    font_large = pygame.font.SysFont('Arial', 48)
    font_small = pygame.font.SysFont('Arial', 32)
    # Updated info to show Coins and current Level (start_level)
    info_txt = font_small.render(f"Coins: {coins}    Level: {start_level}", True, (255,255,255))
    screen.blit(info_txt, info_txt.get_rect(center=(WIDTH//2, HEIGHT//4)))
    # Define button rects
    new_game_btn = pygame.Rect(WIDTH//2 - 100, HEIGHT//2, 200, 50)
    # Draw buttons
    pygame.draw.rect(screen, (70,70,70), new_game_btn)
    # Button texts
    txt_new = font_small.render("New Game", True, WHITE)
    screen.blit(txt_new, txt_new.get_rect(center=new_game_btn.center))
    return new_game_btn

# --- Main Loop (Core Logic) ---
def main():
    global coins, enemy_health_multiplier, start_level
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Runner-Shooter: Squad Assault")  # Fixed method name
    clock = pygame.time.Clock()
    # Updated function: handle input
    def handle_input(event, player, distance, paused, game_over):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return not paused
            elif event.key == pygame.K_r and paused:  # Only allow restart during pause
                return "restart"
            elif not paused and not game_over:
                if event.key == pygame.K_a:
                    player.move(-1)
                elif event.key == pygame.K_d:
                    player.move(1)
                elif event.key == pygame.K_SPACE and player.shoot_cd == 0:
                    proj = Projectile(player.rect.x, player.rect.y, player.weapon)
                    projectiles.add(proj)
                    player.shoot_cd = 15 if player.level < 20 else 8
                elif event.key == pygame.K_u and distance > 3000 and not player.weapon_upgraded:
                    player.weapon = "upgraded"
                    player.weapon_upgraded = True
        return paused
    def update_game_elements(player, projectiles, enemies, gates, particles, boss):
        if player.update():
            proj = Projectile(player.rect.x, player.rect.y, player.weapon)
            projectiles.add(proj)
        projectiles.update()
        enemies.update()
        gates.update()
        if boss:
            boss.update()
        for p in particles:
            p.update()
        particles[:] = [p for p in particles if p.lifetime > 0]
    def handle_collisions(player, projectiles, enemies, gates, boss, enemy_kills):
        global enemy_health_multiplier, coins  # <-- added global declaration
        # Collision: Projectiles vs Enemies
        for proj in projectiles.copy():
            for enemy in enemies.copy():
                if proj.rect.colliderect(enemy.rect):
                    is_crit = random.random() < CRIT_CHANCE
                    dmg = player.level * (2 if is_crit else 1)
                    enemy.health -= dmg
                    if is_crit:
                        floating_texts.append(FloatingText(f"{dmg}!!!", enemy.rect.x, enemy.rect.y - 20))
                    projectiles.remove(proj)
                    if enemy.health <= 0:
                        particles.append(Particle(enemy.rect.centerx, enemy.rect.centery))
                        enemies.remove(enemy)
                        enemy_kills += 1
                        coins += 1  # Award 1 coin per enemy kill
                    break
        # Collision: Projectiles vs Gates
        for proj in projectiles.copy():
            for gate in gates.copy():
                if proj.rect.colliderect(gate.rect):
                    is_crit = random.random() < CRIT_CHANCE
                    multiplier = 2 if is_crit else 1
                    if gate.is_operator:
                        if gate.operator == '*':
                            gate.index += 1 * multiplier
                            gate.display = f"*{abs(gate.index)}"
                        elif gate.operator == '/':
                            gate.index += 1 * multiplier
                            gate.display = f"/{abs(gate.index)}"
                        elif gate.operator == '+':
                            gate.index += 1 * multiplier
                            gate.display = f"+{abs(gate.index)}"
                        elif gate.operator == '-':
                            gate.operator = '+'
                            gate.index = 1 * multiplier
                            gate.display = f"+{abs(gate.index)}"
                    else:
                        base_change = max(1, (player.level + 10) // 20)
                        gate.value += base_change * multiplier
                        gate.display = f"{int(gate.value):+d}"
                    if is_crit:
                        delta = (1 if gate.is_operator else base_change) * multiplier
                        floating_texts.append(FloatingText(f"{delta}!!!", gate.rect.x, gate.rect.y - 20))
                    projectiles.remove(proj)
                    break
        # Collision: Projectiles vs Boss
        if boss:
            for proj in projectiles.copy():
                if proj.rect.colliderect(boss.rect):
                    is_crit = random.random() < CRIT_CHANCE
                    dmg = player.level * (2 if is_crit else 1)
                    boss.health -= dmg
                    if is_crit:
                        floating_texts.append(FloatingText(f"{dmg}!!!", boss.rect.x, boss.rect.y - 20))
                    projectiles.remove(proj)
                    break
        # Collision: Player vs Gates
        for gate in gates.copy():
            if player.rect.colliderect(gate.rect):
                player.gate_collision += 1
                if gate.is_operator:
                    if gate.index >= 0:
                        if gate.operator == '*':
                            player.level *= gate.index
                        elif gate.operator == '/':
                            if gate.index != 0:
                                player.level = int(player.level / gate.index)
                        elif gate.operator == '+':
                            player.level += gate.index
                        elif gate.operator == '-':
                            player.level -= gate.index
                    else:
                        if gate.operator in ['*', '/']:
                            player.level -= gate.index
                        elif gate.operator == '+':
                            player.level += gate.index
                        elif gate.operator == '-':
                            player.level -= gate.index
                else:
                    player.level += gate.value
                enemy_health_multiplier *= 1.1
                for enemy in enemies:
                    enemy.health *= 1.1
                    enemy.max_health *= 1.1
                gates.remove(gate)
        # Collision: Player vs Enemies
        for enemy in enemies.copy():
            if enemy.rect.colliderect(player.rect):
                player.level -= enemy.health
                enemies.remove(enemy)
                enemy_kills += 1
        # Collision: Player vs Boss
        if boss and boss.rect.colliderect(player.rect):
            return True, enemy_kills  # game_over = True
        return False, enemy_kills
    def cleanup_sprites(projectiles, enemies, gates):
        for proj in list(projectiles):
            if proj.rect.y + proj.rect.height <= 0:
                projectiles.remove(proj)
        for enemy in list(enemies):
            if enemy.rect.y >= HEIGHT:
                enemies.remove(enemy)
        for gate in list(gates):
            if gate.rect.y >= HEIGHT:
                gates.remove(gate)
    # Updated draw_game_world to use a camera offset and sort drawables by depth
    def draw_game_world(screen, background_offset, gates, enemies, projectiles, boss, particles, player, distance, player_weapon_upgraded, floating_texts):
        global CAMERA_OFFSET
        # Original line that caused horizontal camera movement:
        # CAMERA_OFFSET = (player.rect.centerx - WIDTH//2, player.rect.bottom - HEIGHT)
        # Changed: fix horizontal offset to 0 so bridge and objects remain stationary horizontally
        CAMERA_OFFSET = (0, player.rect.bottom - HEIGHT)
        # Draw background and lanes (not affected by camera movement)
        screen.fill(WATER_COLOR)
        for i in range(-1, 2):
            bridge_y = (background_offset + i * HEIGHT) % HEIGHT - HEIGHT
            pygame.draw.rect(screen, BRIDGE_COLOR, (BRIDGE_X, bridge_y, BRIDGE_WIDTH, HEIGHT * 2))
        # Collect drawables with their z-value
        drawables = []
        for obj in gates:
            drawables.append((obj.z, obj))
        for obj in enemies:
            drawables.append((obj.z, obj))
        for obj in projectiles:
            drawables.append((obj.z, obj))
        if boss:
            drawables.append((boss.z, boss))
        for obj in particles:
            drawables.append((obj.z, obj))
        for obj in floating_texts:
            drawables.append((obj.z, obj))
        drawables.append((player.z, player))
        # Sort by z value so higher z appears on top
        for _, obj in sorted(drawables, key=lambda item: item[0]):
            obj.draw(screen)
        # Draw UI elements (coins, level, prompts) without camera offset
        coin_txt = FONT.render(f"Coins: {coins}", True, WHITE)
        screen.blit(coin_txt, (10, 10))
        lvl_txt = LARGE_FONT.render(f"Game Level: {fmt(start_level)}", True, WHITE)
        screen.blit(lvl_txt, (20, 20))
        if distance > 3000 and not player_weapon_upgraded:
            prompt = LARGE_FONT.render("Choose your Weapon (U)", True, WHITE)
            screen.blit(prompt, prompt.get_rect(center=(WIDTH // 2, HEIGHT // 2)))
    while True:
        player = Player()
        projectiles = pygame.sprite.Group()
        enemies = pygame.sprite.Group()
        gates = pygame.sprite.Group()
        particles = []
        floating_texts = []  # New: list for critical hit text popups
        boss = None
        boss_spawned = False
        enemy_timer = 90
        gate_timer = 120
        distance = 0
        enemy_kills = 0
        game_over = False
        victory = False
        background_offset = 0
        paused = False  # New: pause state

        # New: Main Menu Loop
        in_menu = True
        while in_menu:
            for event in pygame.event.get():
                if event.type==pygame.QUIT:
                    save_coins()
                    pygame.quit(); sys.exit()
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    mx, my = event.pos
                    new_game_btn = draw_main_menu(screen)
                    if new_game_btn.collidepoint(mx, my):
                        in_menu = False
            new_game_btn = draw_main_menu(screen)
            pygame.display.flip()
            clock.tick(FPS)

        while not game_over:
            clock.tick(FPS)
            for event in pygame.event.get():
                if event.type==pygame.QUIT:
                    save_coins()
                    pygame.quit(); sys.exit()
                ret = handle_input(event, player, distance, paused, game_over)
                if ret == "restart":
                    game_over = True
                    break
                elif isinstance(ret, bool):
                    paused = ret
            if paused:
                # Update pause screen to show restart option
                screen.fill(WATER_COLOR)
                pause_txt = LARGE_FONT.render("Paused", True, WHITE)
                restart_txt = FONT.render("Press R to Restart", True, WHITE)
                screen.blit(pause_txt, pause_txt.get_rect(center=(WIDTH//2, HEIGHT//2 - 30)))
                screen.blit(restart_txt, restart_txt.get_rect(center=(WIDTH//2, HEIGHT//2 + 30)))
                pygame.display.flip()
                continue
            background_offset = (background_offset + BG_SPEED) % HEIGHT
            update_game_elements(player, projectiles, enemies, gates, particles, boss)
            # Update floating texts
            for ft in floating_texts:
                ft.update()
            floating_texts[:] = [ft for ft in floating_texts if ft.lifetime > 0]
            distance += SCROLL_SPEED
            enemy_timer -= 1
            gate_timer -= 1
            if enemy_timer <= 0:
                for _ in range(random.randint(1,2)):
                    enemies.add(Enemy(random.randint(0, LANE_COUNT-1), player.gate_collision))
                enemy_timer = 90
            if gate_timer <= 0:
                for lane in range(LANE_COUNT):
                    if random.random() < 0.5:
                        gates.add(Gate(lane, enemy_kills))
                gate_timer = 120
            if distance > random.randint(8000,12000) and not boss_spawned:
                boss = Boss(player)  # Pass player instance
                boss_spawned = True
            game_over, enemy_kills = handle_collisions(player, projectiles, enemies, gates, boss, enemy_kills)
            cleanup_sprites(projectiles, enemies, gates)
            if player.level <= 0:
                game_over = True
            if boss and boss.health <= 0:
                victory = True
                game_over = True
            # Drawing
            draw_game_world(screen, background_offset, gates, enemies, projectiles, boss, particles, player, distance, player.weapon_upgraded, floating_texts)
            # Draw floating critical hit texts
            for ft in floating_texts:
                ft.draw(screen)
            if game_over:
                msg = "Victory! Boss defeated!" if victory else "Game Over! Squad lost."
                over = LARGE_FONT.render(msg, True, WHITE)
                screen.blit(over, over.get_rect(center=(WIDTH//2, HEIGHT//2)))
                hint = FONT.render("Press R to Restart", True, WHITE)
                screen.blit(hint, hint.get_rect(center=(WIDTH//2, HEIGHT//2 + 50)))
            pygame.display.flip()
        if boss and boss.health <= 0:
            # Boss kill: award 10 coins, level up
            coins += 10
            start_level += 1
            enemy_health_multiplier = 1
        elif boss and boss.health >= 1:
            enemy_health_multiplier = 1
        save_coins()
        pygame.time.delay(1000)
if __name__=='__main__':
    main()
